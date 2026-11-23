var KEY = "operacao30.v1";
var WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
var WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

var state = load();
var view = state.profile ? "today" : "setup";
var focusIso = null;
var wakeLock = null;
var audioCtx = null;
var timer = {
  date: "",
  index: 0,
  left: 0,
  endsAt: 0,
  phase: "idle",
  running: false,
  switchEnds: 0,
  lastBeep: null,
  steps: [],
  step: 0
};

var app = document.getElementById("app");
var sheet = document.getElementById("sheet");

function blank() {
  return {
    profile: null,
    weights: {},
    measures: { start: {}, end: {} },
    checks: {},
    sound: true,
    water: { on: false, from: "08:00", to: "21:00", drunk: {}, sent: {}, marks: {}, clears: {}, pushOk: false }
  };
}

function load() {
  var base = blank();
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || !raw.profile) return base;
    base.profile = raw.profile;
    base.weights = raw.weights || {};
    base.measures = {
      start: Object.assign({}, raw.measures && raw.measures.start),
      end: Object.assign({}, raw.measures && raw.measures.end)
    };
    base.checks = raw.checks || {};
    base.sound = raw.sound !== false;
    base.water = {
      on: !!(raw.water && raw.water.on),
      from: (raw.water && raw.water.from) || "08:00",
      to: (raw.water && raw.water.to) || "21:00",
      drunk: (raw.water && raw.water.drunk) || {},
      sent: (raw.water && raw.water.sent) || {},
      marks: (raw.water && raw.water.marks) || {},
      clears: (raw.water && raw.water.clears) || {},
      pushOk: !!(raw.water && raw.water.pushOk)
    };
    applyWaterMarks(base.water);
    Object.keys(base.weights).forEach(function (id) {
      var n = Number(base.weights[id]);
      if (Number.isFinite(n)) base.weights[id] = n;
      else delete base.weights[id];
    });
  } catch (error) {
    return blank();
  }
  return base;
}

var waterWrite = Promise.resolve();

function writeLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    /* o aparelho pode bloquear o armazenamento; a tela segue usável nesta sessão */
  }
}

function save() {
  writeLocal();
  mirrorWater();
  queueWaterSync();
}

function mirrorWater() {
  if (!state.water || !window.indexedDB) return waterWrite;
  ensureWater();
  applyWaterMarks(state.water);
  var snapshot = JSON.parse(JSON.stringify(state.water));
  waterWrite = waterWrite.then(function () {
    return readWaterRecord();
  }).then(function (stored) {
    if (stored) {
      snapshot.marks = mergeMarkMaps(snapshot.marks, stored.marks);
      snapshot.clears = mergeMarkMaps(snapshot.clears, stored.clears);
      snapshot.sent = mergeSent(snapshot.sent, stored.sent);
      applyWaterMarks(snapshot);
      state.water.marks = snapshot.marks;
      state.water.clears = snapshot.clears;
      state.water.drunk = snapshot.drunk;
      state.water.sent = snapshot.sent;
      writeLocal();
    }
    return writeWaterRecord(snapshot);
  }).catch(function () {});
  return waterWrite;
}

function pullWaterMirror() {
  if (!state.profile || !state.water || !window.indexedDB) return Promise.resolve();
  return readWaterRecord().then(function (stored) {
    if (!stored) return;
    ensureWater();
    state.water.marks = mergeMarkMaps(state.water.marks, stored.marks);
    state.water.clears = mergeMarkMaps(state.water.clears, stored.clears);
    state.water.sent = mergeSent(state.water.sent, stored.sent);
    applyWaterMarks(state.water);
    writeLocal();
    if (document.getElementById("water")) paintWater();
    var plan = waterPlan(todayIso());
    if (plan) updateWaterBadge(plan, todayIso());
  }).catch(function () {});
}

function parseNum(value) {
  var n = Number(String(value == null ? "" : value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function parseISO(value) {
  var parts = String(value).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function iso(date) {
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

function addDays(date, amount) {
  var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
}

function todayIso() {
  return iso(new Date());
}

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function fmt1(value) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtMeters(cm) {
  return (cm / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPlain(value) {
  if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value));
  return fmt1(value);
}

function fmtClock(ms) {
  var total = Math.max(0, Math.ceil(ms / 1000));
  var minutes = Math.floor(total / 60);
  var seconds = total % 60;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function fmtMin(seconds) {
  return Math.round(seconds / 60) + " min";
}

function fmtDate(value) {
  return parseISO(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function startDate() {
  return parseISO(state.profile.startDate);
}

function endIso() {
  return iso(addDays(startDate(), 29));
}

function dayNumber(value) {
  return Math.round((parseISO(value) - startDate()) / 86400000) + 1;
}

function weekOf(day) {
  if (day >= 29) return 4;
  return Math.min(4, Math.ceil(day / 7));
}

function activeIso() {
  if (!state.profile) return todayIso();
  if (focusIso) return focusIso;
  var today = todayIso();
  if (today < state.profile.startDate) return state.profile.startDate;
  if (today > endIso()) return endIso();
  return today;
}

function workoutOf(value) {
  return OP.workouts[parseISO(value).getDay()];
}

function checked(value, index) {
  return !!(state.checks[value] && state.checks[value][index]);
}

function setChecked(value, index, on) {
  if (!state.checks[value]) state.checks[value] = {};
  if (on) state.checks[value][index] = true;
  else delete state.checks[value][index];
}

function isDone(value) {
  var blocks = workoutOf(value).blocks;
  for (var i = 0; i < blocks.length; i += 1) {
    if (!checked(value, i)) return false;
  }
  return blocks.length > 0;
}

function doneCount() {
  var count = 0;
  for (var i = 0; i < 30; i += 1) {
    if (isDone(iso(addDays(startDate(), i)))) count += 1;
  }
  return count;
}

function doseText(block, week) {
  var dose = block.dose || { kind: "note", text: "" };
  if (dose.kind === "sets") {
    var extra = week === 1 ? 0 : week === 4 ? 4 : 2;
    return dose.sets + " séries de " + (dose.reps + extra) + ". O relógio separa a série e o descanso.";
  }
  if (dose.kind === "plank") {
    if (week <= 2) return "2 séries de 15 segundos. Descanse entre elas.";
    if (week === 3) return "2 séries de 20 a 25 segundos.";
    return "2 séries de 25 a 30 segundos.";
  }
  if (dose.kind === "interval") {
    if (week >= 3) return "1 min moderado e 1 min leve, três vezes. Nos minutos moderados, vá com mais disposição.";
    return "1 min moderado e 1 min leve, três vezes.";
  }
  if (dose.kind === "bike") return bikeText(dose.level, week);
  var text = dose.text || "";
  if (dose.progress && week === 2) text += " Se a forma estiver boa, faça 2 repetições a mais.";
  if (dose.progress && week === 3) text += " Mantenha a forma e um ritmo firme.";
  if (dose.progress && week === 4) text += " Aumente um pouco as repetições, sem exaustão.";
  return text;
}

function bikeText(level, week) {
  if (level === "leve") return "Ritmo leve: dá para conversar normalmente.";
  if (level === "conforto") {
    return week <= 2
      ? "Ritmo confortável, ainda conseguindo conversar."
      : "Ritmo confortável, um pouco mais solto que no começo.";
  }
  if (level === "moderada") {
    if (week <= 2) return "Respiração mais forte, mas você ainda consegue falar.";
    if (week === 3) return "Moderada, com um pouco mais de ritmo. Sem esgotar.";
    return "Moderada e constante, sem chegar à exaustão.";
  }
  if (level === "solta") return "Solte o ritmo e recupere a respiração.";
  return "";
}

function blockName(block) {
  return block.label || OP.exercises[block.ex].name;
}

function bmiValue(kg, cm) {
  if (!Number.isFinite(kg) || !Number.isFinite(cm) || cm <= 0) return null;
  var meters = cm / 100;
  return kg / (meters * meters);
}

function bmiLabel(value) {
  if (value < 18.5) return "Abaixo do peso";
  if (value < 25) return "Peso adequado";
  if (value < 30) return "Sobrepeso";
  if (value < 35) return "Obesidade grau I";
  if (value < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

function lastWeight() {
  var found = null;
  OP.weights.forEach(function (slot) {
    if (typeof state.weights[slot.id] === "number") found = { slot: slot, kg: state.weights[slot.id] };
  });
  return found;
}

function firstWeight() {
  for (var i = 0; i < OP.weights.length; i += 1) {
    var slot = OP.weights[i];
    if (typeof state.weights[slot.id] === "number") return { slot: slot, kg: state.weights[slot.id] };
  }
  return null;
}

function ensureAudio() {
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function tone(context, freq, when, duration, gain) {
  var oscillator = context.createOscillator();
  var amp = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(freq, when);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(amp);
  amp.connect(context.destination);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.03);
}

function play(notes) {
  if (!state.sound) return;
  var context = ensureAudio();
  if (!context) return;
  var run = function () {
    var start = context.currentTime;
    notes.forEach(function (note) {
      tone(context, note.f, start + note.at, note.d, note.g || 0.07);
    });
  };
  if (context.state === "running") run();
  else context.resume().then(run).catch(function () {});
}

function playStart() {
  play([
    { f: 523, at: 0, d: 0.12, g: 0.07 },
    { f: 784, at: 0.14, d: 0.18, g: 0.08 }
  ]);
  buzz([40, 30, 50]);
}

function playEnd() {
  play([
    { f: 523, at: 0, d: 0.14, g: 0.08 },
    { f: 659, at: 0.16, d: 0.14, g: 0.08 },
    { f: 880, at: 0.32, d: 0.28, g: 0.09 }
  ]);
  buzz([80, 50, 80, 50, 160]);
}

function playTick() {
  play([{ f: 988, at: 0, d: 0.07, g: 0.04 }]);
}

function playRest() {
  play([{ f: 392, at: 0, d: 0.18, g: 0.06 }]);
  buzz([40]);
}

function phasesFor(block, week) {
  var dose = block.dose || {};
  if (dose.kind === "sets") {
    var sets = dose.sets || 2;
    var work = dose.work || 40;
    var rest = dose.rest || 40;
    var phases = [];
    for (var i = 0; i < sets; i += 1) {
      phases.push({ kind: "work", sec: work, set: i + 1, sets: sets });
      if (i < sets - 1) phases.push({ kind: "rest", sec: rest, set: i + 1, sets: sets });
    }
    return phases;
  }
  if (dose.kind === "plank") {
    var hold = week <= 2 ? 15 : week === 3 ? 25 : 30;
    var pause = week <= 2 ? 45 : week === 3 ? 35 : 30;
    return [
      { kind: "work", sec: hold, set: 1, sets: 2 },
      { kind: "rest", sec: pause, set: 1, sets: 2 },
      { kind: "work", sec: hold, set: 2, sets: 2 },
      { kind: "rest", sec: pause, set: 2, sets: 2 }
    ];
  }
  if (dose.kind === "interval") {
    var rounds = [];
    for (var round = 1; round <= 3; round += 1) {
      rounds.push({ kind: "work", sec: 60, set: round, sets: 3, label: "Minuto firme" });
      rounds.push({ kind: "rest", sec: 60, set: round, sets: 3, label: "Minuto leve" });
    }
    return rounds;
  }
  return [{ kind: "work", sec: block.sec, set: 1, sets: 1 }];
}

function prepareSteps() {
  var block = currentBlock();
  var week = weekOf(dayNumber(timer.date));
  timer.steps = block ? phasesFor(block, week) : [{ kind: "work", sec: 1, set: 1, sets: 1 }];
  timer.step = 0;
  timer.left = timer.steps[0].sec * 1000;
}

function currentStep() {
  if (timer.steps && timer.steps[timer.step]) return timer.steps[timer.step];
  var block = timer.date ? currentBlock() : null;
  return { kind: "work", sec: block ? block.sec : 1, set: 1, sets: 1 };
}

function stepDose(block, week) {
  var step = currentStep();
  if (step.kind === "rest") {
    if (step.label) return step.label + ". Recupere a respiração. A próxima parte começa sozinha.";
    if (step.set >= step.sets) return "Recupere a respiração. O próximo exercício começa sozinho.";
    return "Descanso. Solte o corpo e respire. A próxima série começa sozinha.";
  }
  if (step.label) return step.label + ". " + doseText(block, week);
  if (step.sets > 1 && block.dose && (block.dose.kind === "sets" || block.dose.kind === "plank")) {
    return "Série " + step.set + " de " + step.sets + ". " + doseText(block, week);
  }
  return doseText(block, week);
}

function buzz(pattern) {
  if (!state.sound || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

function lockScreen() {
  if (!navigator.wakeLock || document.visibilityState !== "visible") return;
  navigator.wakeLock.request("screen").then(function (lock) {
    wakeLock = lock;
  }).catch(function () {});
}

function unlockScreen() {
  if (!wakeLock) return;
  wakeLock.release().catch(function () {});
  wakeLock = null;
}

function currentBlock() {
  var workout = workoutOf(timer.date);
  return workout.blocks[timer.index];
}

function openTimer(date, index, auto) {
  var same = timer.date === date && timer.index === index && (timer.phase === "pause" || timer.phase === "idle") && timer.steps && timer.steps.length;
  if (!same) {
    timer.date = date;
    timer.index = index;
    prepareSteps();
    timer.phase = "idle";
    timer.lastBeep = null;
  }
  timer.running = false;
  view = "timer";
  render();
  if (!auto) return;
  if (timer.phase === "idle" || timer.phase === "pause") startRun();
}

function startRun() {
  if (timer.phase === "run" || timer.phase === "done") return;
  var block = currentBlock();
  if (!block) return;
  if (timer.phase !== "pause") {
    if (!timer.steps || !timer.steps.length) prepareSteps();
    timer.left = currentStep().sec * 1000;
  }
  if (currentStep().kind === "rest") playRest();
  else playStart();
  timer.phase = "run";
  timer.endsAt = Date.now() + timer.left;
  timer.lastBeep = null;
  timer.running = true;
  lockScreen();
  render();
}

function pauseTimer() {
  if (timer.phase === "run") {
    timer.left = Math.max(0, timer.endsAt - Date.now());
    timer.phase = "pause";
    timer.running = false;
    render();
    return;
  }
  if (timer.phase === "switch") {
    timer.phase = "idle";
    timer.running = false;
    timer.left = currentStep().sec * 1000;
    render();
  }
}

function finishBlock() {
  if (timer.phase !== "run" && timer.phase !== "pause") return;
  timer.phase = "ending";
  timer.running = false;
  setChecked(timer.date, timer.index, true);
  save();
  playEnd();
  var blocks = workoutOf(timer.date).blocks;
  if (timer.index >= blocks.length - 1) {
    timer.phase = "done";
    unlockScreen();
    render();
    return;
  }
  timer.index += 1;
  prepareSteps();
  timer.phase = "switch";
  timer.switchEnds = Date.now() + 1600;
  timer.running = true;
  render();
}

function leaveTimer() {
  if (timer.phase === "run") {
    timer.left = Math.max(0, timer.endsAt - Date.now());
    timer.phase = "pause";
  }
  if (timer.phase === "switch" || timer.phase === "ending") timer.phase = "idle";
  timer.running = false;
  unlockScreen();
  view = "today";
  focusIso = timer.date;
  render();
}

function tick() {
  if (!timer.running) return;
  if (timer.phase === "switch") {
    if (Date.now() >= timer.switchEnds) startRun();
    return;
  }
  if (timer.phase !== "run") return;
  var left = Math.max(0, timer.endsAt - Date.now());
  timer.left = left;
  var second = Math.ceil(left / 1000);
  if (second >= 1 && second <= 3 && timer.lastBeep !== second) {
    timer.lastBeep = second;
    playTick();
  }
  updateClock();
  if (left > 0) return;
  var steps = timer.steps || [];
  if (timer.step < steps.length - 1) {
    timer.step += 1;
    var next = timer.steps[timer.step];
    timer.left = next.sec * 1000;
    timer.endsAt = Date.now() + timer.left;
    timer.lastBeep = null;
    if (next.kind === "rest") playRest();
    else playStart();
    render();
    return;
  }
  finishBlock();
}

function updateClock() {
  var clock = document.getElementById("clock");
  var ring = document.getElementById("ring");
  if (!clock || !ring) return;
  var block = currentBlock();
  if (!block) return;
  var total = currentStep().sec * 1000 || 1;
  var left = timer.phase === "run" ? Math.max(0, timer.endsAt - Date.now()) : timer.left;
  clock.textContent = fmtClock(left);
  var length = 2 * Math.PI * 90;
  var elapsed = timer.phase === "switch" || timer.phase === "idle" ? 0 : Math.min(1, Math.max(0, 1 - left / total));
  ring.style.strokeDasharray = String(length);
  ring.style.strokeDashoffset = String(length * (1 - elapsed));
}

function icon(name) {
  var common = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  if (name === "today") return '<svg ' + common + '><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>';
  if (name === "plan") return '<svg ' + common + '><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>';
  if (name === "evo") return '<svg ' + common + '><path d="M4 16l5-5 3 3 7-8"/><path d="M14 6h6v6"/></svg>';
  if (name === "sound") return '<svg ' + common + '><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 7a7 7 0 0 1 0 10"/></svg>';
  if (name === "mute") return '<svg ' + common + '><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M17 10l4 4M21 10l-4 4"/></svg>';
  if (name === "check") return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
  return '<svg ' + common + '><circle cx="12" cy="8" r="3"/><path d="M5 19c1.5-3 3.8-4.5 7-4.5S17.5 16 19 19"/></svg>';
}

function nav() {
  if (!state.profile || view === "setup" || view === "timer") return "";
  var items = [
    ["today", "Hoje"],
    ["plan", "30 dias"],
    ["evo", "Evolução"],
    ["me", "Perfil"]
  ];
  return '<nav>' + items.map(function (item) {
    return '<button type="button" data-act="nav" data-view="' + item[0] + '" class="' + (view === item[0] ? "on" : "") + '">' +
      icon(item[0] === "today" ? "today" : item[0] === "plan" ? "plan" : item[0] === "evo" ? "evo" : "me") +
      "<span>" + item[1] + "</span></button>";
  }).join("") + "</nav>";
}

function brand(text) {
  return '<p class="brand"><img src="icons/mark-64.png" alt="" width="22" height="22">' + text + "</p>";
}

function shell(content) {
  app.innerHTML = '<div class="stripe"></div>' + content + nav();
}

function validateBody(age, height, weight) {
  if (!Number.isFinite(age) || age < 12 || age > 100) return "Informe a idade entre 12 e 100 anos.";
  if (!Number.isFinite(height) || height < 100 || height > 250) return "Informe a altura em centímetros, entre 100 e 250.";
  if (weight != null && (!Number.isFinite(weight) || weight < 30 || weight > 300)) return "Informe o peso em quilos, entre 30 e 300.";
  return "";
}

function render() {
  if (timer.phase === "run") timer.left = Math.max(0, timer.endsAt - Date.now());
  if (!state.profile) {
    view = "setup";
    renderSetup();
    return;
  }
  if (view === "timer") renderTimer();
  else if (view === "plan") renderPlan();
  else if (view === "evo") renderEvo();
  else if (view === "me") renderMe();
  else renderToday();
  if (view === "timer") updateClock();
}

function renderSetup() {
  shell(
    '<div class="wrap">' +
      '<img class="logo-hero" src="icons/logo.png" alt="Operação 30">' +
      "<h1>Calistenia e bicicleta, 15 minutos por dia.</h1>" +
      '<p class="lead">Seis dias de treino e um domingo de recuperação. O plano repete por quatro semanas e fica um pouco mais firme a cada uma.</p>' +
      '<form id="setup-form">' +
        field("Como quer ser chamado", "s-name", "text", "Opcional", "") +
        field("Idade", "s-age", "text", "35", "numeric") +
        field("Altura (cm)", "s-height", "text", "170", "decimal") +
        field("Peso de hoje (kg)", "s-weight", "text", "80,5", "decimal") +
        field("Começar em", "s-start", "date", "", "") +
        '<p class="lead">O treino segue o dia da semana. Segunda é peito, costas e braços. Domingo é recuperação. Se hoje for domingo, o dia 1 começa leve.</p>' +
        '<div class="card" id="s-bmi"><p class="muted">O IMC aparece quando peso e altura estiverem preenchidos.</p></div>' +
        '<p class="error" id="s-err"></p>' +
        '<button class="primary" type="submit">Começar</button>' +
      "</form>" +
    "</div>"
  );
  var start = document.getElementById("s-start");
  if (start) start.value = todayIso();
  bindSetupBmi();
}

function field(label, id, type, placeholder, mode) {
  var inputMode = mode ? ' inputmode="' + mode + '"' : "";
  var value = type === "date" ? "" : "";
  return '<div class="field"><label for="' + id + '">' + label + "</label>" +
    '<input id="' + id + '" name="' + id + '" type="' + type + '"' + inputMode +
    (placeholder ? ' placeholder="' + esc(placeholder) + '"' : "") +
    ' autocomplete="off" value="' + value + '"></div>';
}

function bindSetupBmi() {
  var height = document.getElementById("s-height");
  var weight = document.getElementById("s-weight");
  var out = document.getElementById("s-bmi");
  if (!height || !weight || !out) return;
  var update = function () {
    var bmi = bmiValue(parseNum(weight.value), parseNum(height.value));
    out.innerHTML = bmi
      ? '<div class="bmi-num">' + fmt1(bmi) + "</div><p>" + bmiLabel(bmi) + "</p>" +
        '<p class="small muted">IMC = peso ÷ altura². A altura entra em metros.</p>'
      : '<p class="muted">O IMC aparece quando peso e altura estiverem preenchidos.</p>';
  };
  height.addEventListener("input", update);
  weight.addEventListener("input", update);
}

function submitSetup() {
  var age = parseNum(document.getElementById("s-age").value);
  var height = parseNum(document.getElementById("s-height").value);
  var weight = parseNum(document.getElementById("s-weight").value);
  var start = document.getElementById("s-start").value;
  var error = validateBody(age, height, weight);
  if (!error && !start) error = "Escolha a data de início.";
  var box = document.getElementById("s-err");
  if (error) {
    box.textContent = error;
    return;
  }
  state.profile = {
    name: document.getElementById("s-name").value.trim(),
    age: Math.round(age),
    heightCm: Math.round(height * 10) / 10,
    startDate: start
  };
  state.weights["0"] = Math.round(weight * 10) / 10;
  save();
  focusIso = null;
  view = "today";
  render();
}

function ensureWater() {
  if (!state.water) state.water = { on: false, from: "08:00", to: "21:00", drunk: {}, sent: {}, marks: {}, clears: {} };
  if (!state.water.drunk) state.water.drunk = {};
  if (!state.water.sent) state.water.sent = {};
  if (!state.water.marks) state.water.marks = {};
  if (!state.water.clears) state.water.clears = {};
}

function setGlass(date, index, on) {
  ensureWater();
  state.water.marks[date] = state.water.marks[date] || {};
  state.water.clears[date] = state.water.clears[date] || {};
  if (on) state.water.marks[date][index] = Date.now();
  else state.water.clears[date][index] = Date.now();
  applyWaterMarks(state.water);
}

function mlPerKg(age) {
  if (age >= 56) return 30;
  if (age >= 31) return 33;
  return 35;
}

function exerciseWater(date) {
  var day = parseISO(date).getDay();
  if (day === 0) return 200;
  if (day === 6) return 350;
  return 500;
}

function exerciseWaterName(extra) {
  if (extra >= 500) return "do treino de hoje";
  if (extra >= 350) return "do pedal de hoje";
  return "da recuperação de hoje";
}

function fmtL(ml) {
  var liters = ml / 1000;
  var tenth = Math.abs(liters * 10 - Math.round(liters * 10)) < 0.001;
  var digits = tenth ? 1 : 2;
  return liters.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " L";
}

function fmtHM(ms) {
  var date = new Date(ms);
  return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

function waterPlan(date) {
  var latest = lastWeight();
  if (!latest || !state.profile) return null;
  var per = mlPerKg(state.profile.age);
  var base = Math.round(latest.kg * per / 100) * 100;
  var extra = exerciseWater(date);
  var glass = 250;
  var count = Math.ceil((base + extra) / glass);
  if (count < 6) count = 6;
  if (count > 16) count = 16;
  return {
    kg: latest.kg,
    per: per,
    base: base,
    extra: extra,
    glass: glass,
    count: count,
    total: count * glass
  };
}

function drunkList(date, count) {
  ensureWater();
  if (!Array.isArray(state.water.drunk[date])) state.water.drunk[date] = [];
  var list = state.water.drunk[date];
  while (list.length < count) list.push(false);
  if (list.length > count) list.length = count;
  return list;
}

function parseHM(value) {
  var parts = String(value || "08:00").split(":");
  var hour = Number(parts[0]);
  var minute = Number(parts[1]);
  return {
    h: Number.isFinite(hour) ? hour : 8,
    m: Number.isFinite(minute) ? minute : 0
  };
}

function waterSlots(date, plan) {
  ensureWater();
  var from = parseHM(state.water.from);
  var to = parseHM(state.water.to);
  var start = parseISO(date);
  start.setHours(from.h, from.m, 0, 0);
  var end = parseISO(date);
  end.setHours(to.h, to.m, 0, 0);
  if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
  var span = end.getTime() - start.getTime();
  var slots = [];
  for (var i = 0; i < plan.count; i += 1) {
    var at = plan.count === 1 ? start.getTime() : start.getTime() + Math.round(span * i / (plan.count - 1));
    slots.push({ index: i, at: at });
  }
  return slots;
}

function waterHTML() {
  var date = todayIso();
  var plan = waterPlan(date);
  if (!plan) {
    return '<section class="card" id="water"><h2>Água de hoje</h2><p>Coloque o peso em Evolução para calcular quanto beber.</p></section>';
  }
  ensureWater();
  var list = drunkList(date, plan.count);
  var done = list.filter(Boolean).length;
  var glasses = list.map(function (on, index) {
    return '<button type="button" class="glass' + (on ? " on" : "") + '" data-act="water-glass" data-index="' + index + '" aria-pressed="' + on + '" aria-label="Copo ' + (index + 1) + " de " + plan.count + '">' + (index + 1) + "</button>";
  }).join("");
  var slots = waterSlots(date, plan);
  var next = null;
  for (var i = 0; i < slots.length; i += 1) {
    if (!list[slots[i].index] && slots[i].at >= Date.now() - 60000) {
      next = slots[i];
      break;
    }
  }
  var nextLine = next
    ? "Próximo copo às " + fmtHM(next.at) + "."
    : (done >= plan.count ? "Meta de hoje fechada." : "Os horários de hoje já passaram.");
  var remind = state.water.on
    ? '<button type="button" class="secondary" data-act="water-off">Desligar lembretes</button>'
    : '<button type="button" class="primary" data-act="water-on">Ativar lembretes</button>';
  return '<section class="card" id="water">' +
    "<h2>Água de hoje</h2>" +
    '<p class="water-total">' + fmtL(plan.total) + "</p>" +
    '<p class="small">' + fmtPlain(plan.kg) + " kg × " + plan.per + " ml = " + fmtL(plan.base) + ". Mais " + fmtL(plan.extra) + " " + exerciseWaterName(plan.extra) + ". Arredondado em copos de 250 ml.</p>" +
    '<div class="glasses">' + glasses + "</div>" +
    '<p class="bar-label">' + fmtL(done * plan.glass) + " bebidos · faltam " + fmtL((plan.count - done) * plan.glass) + "</p>" +
    '<div class="row-2">' +
      '<label class="small">Primeiro aviso<input id="water-from" type="time" value="' + esc(state.water.from) + '"></label>' +
      '<label class="small">Último aviso<input id="water-to" type="time" value="' + esc(state.water.to) + '"></label>' +
    "</div>" +
    remind +
    '<p class="small muted" id="water-note">' + esc(waterNoteText(nextLine, plan)) + "</p>" +
  "</section>";
}

function waterNoteText(nextLine, plan) {
  var closed = waterPushReady === "fail"
    ? "Não consegui registrar o celular para avisar com o app fechado. Feche e abra de novo com internet."
    : "O aviso também chega com o app fechado. O celular precisa de internet e pode atrasar alguns minutos.";
  return nextLine + " Cada aviso é um copo de " + plan.glass + " ml. No aviso, toque em Bebi para marcar esse copo sem abrir o app. Se o botão não aparecer, puxe o aviso para baixo. " + closed + " Estimativa, não é receita médica.";
}

function refreshWaterNote() {
  var note = document.getElementById("water-note");
  if (!note) return;
  var date = todayIso();
  var plan = waterPlan(date);
  if (!plan) return;
  var list = drunkList(date, plan.count);
  var slots = waterSlots(date, plan);
  var next = null;
  for (var i = 0; i < slots.length; i += 1) {
    if (!list[slots[i].index] && slots[i].at >= Date.now() - 60000) {
      next = slots[i];
      break;
    }
  }
  var done = list.filter(Boolean).length;
  var nextLine = next
    ? "Próximo copo às " + fmtHM(next.at) + "."
    : (done >= plan.count ? "Meta de hoje fechada." : "Os horários de hoje já passaram.");
  note.textContent = waterNoteText(nextLine, plan);
}

function paintWater() {
  var current = document.getElementById("water");
  if (!current) return;
  current.outerHTML = waterHTML();
}

function waterNoticeOptions(date, index, plan) {
  var number = index + 1;
  return {
    body: "Copo " + number + " de " + plan.count + ". " + plan.glass + " ml. Toque em Bebi para marcar.",
    icon: "icons/icon-192.png",
    badge: "icons/favicon-32.png",
    tag: "agua",
    renotify: true,
    lang: "pt-BR",
    actions: [{ action: "bebido", title: "Bebi" }],
    data: { date: date, index: index, count: plan.count, glass: plan.glass }
  };
}

function showWaterNotice(date, index, plan) {
  var options = waterNoticeOptions(date, index, plan);
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.showNotification("Hora da água", options);
    }).catch(function () {});
    return;
  }
}

function updateWaterBadge(plan, date) {
  if (!navigator.setAppBadge) return;
  var left = plan.count - drunkList(date, plan.count).filter(Boolean).length;
  var action = left > 0 ? navigator.setAppBadge(left) : (navigator.clearAppBadge ? navigator.clearAppBadge() : Promise.resolve());
  if (action && action.catch) action.catch(function () {});
}

function scheduleSystemWater(date, plan) {
  if (typeof TimestampTrigger === "undefined" || !navigator.serviceWorker) return;
  navigator.serviceWorker.ready.then(function (reg) {
    waterSlots(date, plan).forEach(function (slot) {
      if (slot.at <= Date.now()) return;
      var options = waterNoticeOptions(date, slot.index, plan);
      options.tag = "agua-" + date + "-" + slot.index;
      options.showTrigger = new TimestampTrigger(slot.at);
      reg.showNotification("Hora da água", options).catch(function () {});
    });
  }).catch(function () {});
}

var waterTimer = null;
var waterSyncTimer = null;
var waterPushReady = "";

function urlBase64ToUint8Array(base64String) {
  var padding = "=".repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  var raw = atob(base64);
  var output = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function queueWaterSync() {
  if (!state.profile || !state.water) return;
  if (waterSyncTimer) clearTimeout(waterSyncTimer);
  waterSyncTimer = setTimeout(syncWaterPush, 1200);
}

function syncWaterPush() {
  var profile = state.profile;
  var water = state.water;
  if (!profile || !water || !navigator.serviceWorker) return Promise.resolve();
  var on = !!water.on;
  var from = water.from;
  var to = water.to;
  var latest = on ? lastWeight() : null;
  var kg = latest ? latest.kg : null;
  var age = profile.age;
  var tz = new Date().getTimezoneOffset();
  var drunk = {};
  if (on && water.drunk) {
    [todayIso(), iso(addDays(new Date(), -1))].forEach(function (date) {
      if (Array.isArray(water.drunk[date])) drunk[date] = water.drunk[date].slice();
    });
  }
  return navigator.serviceWorker.ready.then(function (reg) {
    if (!on) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (!sub) return { ok: true };
        return fetch("/.netlify/functions/water-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ on: false, subscription: sub.toJSON() })
        }).then(function (res) { return { ok: res.ok }; });
      });
    }
    if (typeof Notification === "undefined" || Notification.permission !== "granted" || !kg) return { ok: false };
    return fetch("/.netlify/functions/water-key", { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("chave");
      return res.json();
    }).then(function (body) {
      if (!body || !body.publicKey) throw new Error("chave");
      var appKey = urlBase64ToUint8Array(body.publicKey);
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing) return existing;
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
      });
    }).then(function (sub) {
      return fetch("/.netlify/functions/water-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          on: true,
          subscription: sub.toJSON(),
          from: from,
          to: to,
          tzOffsetMinutes: tz,
          kg: kg,
          age: age,
          drunk: drunk
        })
      });
    }).then(function (res) { return { ok: !!(res && res.ok) }; });
  }).then(function (result) {
    if (!state.water) return;
    if (on && result && result.ok) {
      state.water.pushOk = true;
      waterPushReady = "on";
      writeLocal();
    } else if (on && !state.water.pushOk) {
      waterPushReady = "fail";
    }
    refreshWaterNote();
  }).catch(function () {
    if (on && state.water && !state.water.pushOk) waterPushReady = "fail";
    refreshWaterNote();
  });
}

function armWater() {
  if (waterTimer) clearTimeout(waterTimer);
  if (!state.profile || !state.water || !state.water.on) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  var date = todayIso();
  var plan = waterPlan(date);
  if (!plan) return;
  ensureWater();
  if (!state.water.sent[date]) state.water.sent[date] = {};
  var list = drunkList(date, plan.count);
  var slots = waterSlots(date, plan);
  var now = Date.now();
  var due = null;
  var changed = false;
  slots.forEach(function (slot) {
    if (list[slot.index] || state.water.sent[date][slot.index]) return;
    if (slot.at <= now && now - slot.at < 50 * 60 * 1000) due = slot;
    if (slot.at <= now) {
      state.water.sent[date][slot.index] = true;
      changed = true;
    }
  });
  if (due) {
    showWaterNotice(date, due.index, plan);
  }
  if (changed) save();
  var upcoming = null;
  for (var i = 0; i < slots.length; i += 1) {
    if (!list[slots[i].index] && !state.water.sent[date][slots[i].index] && slots[i].at > now) {
      upcoming = slots[i];
      break;
    }
  }
  if (!upcoming) return;
  var wait = Math.min(upcoming.at - now, 30 * 60 * 1000);
  waterTimer = setTimeout(armWater, Math.max(1000, wait + 200));
}

function enableWaterReminders() {
  ensureWater();
  if (typeof Notification === "undefined") {
    window.alert("Este celular não deixou o aplicativo enviar aviso. Os copos continuam aqui para marcar.");
    return;
  }
  Notification.requestPermission().then(function (result) {
    state.water.on = result === "granted";
    save();
    paintWater();
    if (result !== "granted") {
      window.alert("Para o lembrete aparecer, permita as notificações do Operação 30 nas configurações do celular.");
      return;
    }
    var date = todayIso();
    var plan = waterPlan(date);
    if (plan) {
      scheduleSystemWater(date, plan);
      updateWaterBadge(plan, date);
    }
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg.periodicSync) reg.periodicSync.register("agua", { minInterval: 60 * 60 * 1000 }).catch(function () {});
      }).catch(function () {});
    }
    armWater();
  });
}

function renderToday() {
  var date = activeIso();
  var day = dayNumber(date);
  var week = OP.weeks[weekOf(day)] || OP.weeks[1];
  var workout = workoutOf(date);
  var blocks = workout.blocks;
  var doneBlocks = blocks.filter(function (_, index) { return checked(date, index); }).length;
  var finished = doneCount();
  var today = todayIso();
  var banner = "";
  if (date !== today) {
    banner = '<div class="banner"><strong>Você está no dia ' + day + ".</strong> " +
      esc(WEEKDAYS[parseISO(date).getDay()]) + ", " + fmtDate(date) +
      '<br><button type="button" data-act="back-today">Voltar para hoje</button></div>';
  } else if (today < state.profile.startDate) {
    banner = '<div class="banner"><strong>A operação começa em ' + fmtDate(state.profile.startDate) + ".</strong> Este é o plano do dia 1.</div>";
  } else if (today > endIso()) {
    banner = '<div class="banner"><strong>Os 30 dias fecharam.</strong> O histórico continua aqui. O peso novo entra em Evolução.</div>';
  }
  if (day >= 29) {
    banner += '<div class="banner"><strong>Desafio final.</strong> Anote de novo o peso, a cintura, as flexões inclinadas e o tempo de prancha.</div>';
  } else if (parseISO(date).getDay() === 0) {
    banner += '<div class="banner"><strong>Domingo é recuperação.</strong> Sem buscar intensidade. O corpo usa este dia para evoluir.</div>';
  }
  var cards = blocks.map(function (block, index) {
    var on = checked(date, index);
    return '<article class="ex' + (on ? " done" : "") + '">' +
      '<button type="button" class="check' + (on ? " on" : "") + '" data-act="check" data-date="' + date + '" data-index="' + index + '" aria-pressed="' + on + '" aria-label="' + (on ? "Desmarcar" : "Marcar") + " " + esc(blockName(block)) + '">' +
      (on ? icon("check") : "") + "</button>" +
      '<button type="button" class="ex-main" data-act="open-timer" data-date="' + date + '" data-index="' + index + '">' +
        '<div class="ex-top"><strong>' + esc(blockName(block)) + "</strong><span class=\"time\">" + fmtMin(block.sec) + "</span></div>" +
        "<p>" + esc(doseText(block, weekOf(day))) + "</p>" +
      "</button>" +
      '<button type="button" class="video" data-act="video" data-ex="' + block.ex + '">Vídeo</button>' +
    "</article>";
  }).join("");
  var action = finishedDay(date)
    ? '<button type="button" class="secondary" data-act="start-workout">Abrir cronômetro</button>'
    : '<button type="button" class="primary" data-act="start-workout">' + (doneBlocks ? "Continuar treino" : "Iniciar treino") + "</button>";
  shell(
    '<div class="wrap">' +
      '<header class="top"><div>' + brand("Operação 30") + "<h1>" + esc(workout.title) + "</h1></div>" +
      soundButton() + "</header>" +
      '<div class="meta"><span class="chip">Dia <strong>' + day + "</strong> de 30</span>" +
      '<span class="chip">' + esc(WEEKDAYS[parseISO(date).getDay()]) + "</span>" +
      '<span class="chip">Semana ' + weekOf(day) + " · <strong>" + esc(week.name) + "</strong></span></div>" +
      '<div class="bar" aria-hidden="true"><span style="width:' + (finished / 30 * 100) + '%"></span></div>' +
      '<p class="bar-label">' + finished + " de 30 dias · " + doneBlocks + " de " + blocks.length + (date === today ? " exercícios de hoje" : " exercícios deste dia") + "</p>" +
      '<p class="lead">' + esc(week.line) + "</p>" +
      banner +
      '<div class="list">' + cards + "</div>" +
      action +
      waterHTML() +
      '<p class="safety">Não force articulação e não treine com dor. Dor no peito, tontura ou falta de ar diferente do esforço: pare.</p>' +
    "</div>"
  );
}

function finishedDay(date) {
  return isDone(date);
}

function soundButton() {
  return '<button type="button" class="icon-btn" data-act="toggle-sound" aria-label="' + (state.sound ? "Desligar sons" : "Ligar sons") + '">' +
    icon(state.sound ? "sound" : "mute") + "</button>";
}

function renderTimer() {
  var block = currentBlock();
  var workout = workoutOf(timer.date);
  var day = dayNumber(timer.date);
  var week = weekOf(day);
  if (timer.phase === "done" || !block) {
    var total = doneCount();
    var complete = isDone(timer.date);
    shell(
      '<div class="timer"><div class="timer-top"><button type="button" class="text-btn icon-btn" data-act="timer-back" aria-label="Voltar">' +
      backIcon() + "</button>" + soundButton() + "</div>" +
      '<div class="done-box"><div class="big-check">' + icon("check") + "</div>" +
      "<h1>" + (complete ? "Dia concluído" : "Exercício marcado") + "</h1>" +
      '<p class="lead">' + (complete
        ? total + " de 30 dias. " + esc(workout.title) + " fechado."
        : "Este bloco foi marcado. Ainda há exercício deste dia sem o check.") + "</p>" +
      '<button type="button" class="primary" data-act="timer-back">Voltar ao dia</button>' +
      (day >= 29 ? '<button type="button" class="secondary" data-act="goto" data-view="evo">Registrar as medidas</button>' : "") +
      "</div></div>"
    );
    return;
  }
  var step = currentStep();
  var resting = step.kind === "rest" && timer.phase !== "switch";
  var phaseLabel = "Pronto";
  if (timer.phase === "switch") phaseLabel = "A seguir";
  else if (resting && timer.phase === "pause") phaseLabel = "Descanso pausado";
  else if (resting) phaseLabel = "Descanso";
  else if (timer.phase === "pause") phaseLabel = "Pausado";
  else if (step.sets > 1) phaseLabel = "Série " + step.set + " de " + step.sets;
  else if (timer.phase === "run") phaseLabel = "Em andamento";
  var canStart = timer.phase === "idle" || timer.phase === "pause" || timer.phase === "switch";
  var canPause = timer.phase === "run" || timer.phase === "switch";
  var canFinish = timer.phase === "idle" || timer.phase === "run" || timer.phase === "pause";
  shell(
    '<div class="timer' + (resting ? " resting" : "") + '">' +
      '<div class="timer-top"><button type="button" class="icon-btn" data-act="timer-back" aria-label="Voltar">' + backIcon() + "</button>" +
      soundButton() + "</div>" +
      '<p class="kicker">' + phaseLabel + " · " + (timer.index + 1) + " de " + workout.blocks.length + "</p>" +
      "<h1>" + esc(blockName(block)) + "</h1>" +
      '<div class="clock-wrap"><svg viewBox="0 0 220 220" aria-hidden="true">' +
        '<circle class="ring-bg" cx="110" cy="110" r="90"></circle>' +
        '<circle id="ring" class="ring-fg" cx="110" cy="110" r="90" transform="rotate(-90 110 110)"></circle>' +
      '</svg><div id="clock">' + fmtClock(timer.left) + "</div></div>" +
      '<p class="dose">' + esc(stepDose(block, week)) + "</p>" +
      '<p class="cue">' + esc(OP.exercises[block.ex].cue) + "</p>" +
      '<button type="button" class="video-link" data-act="video" data-ex="' + block.ex + '">Ver como fazer</button>' +
      '<div class="controls">' +
        '<button type="button" class="btn-start" data-act="timer-start"' + (canStart ? "" : " disabled") + ">Iniciar</button>" +
        '<button type="button" class="btn-pause" data-act="timer-pause"' + (canPause ? "" : " disabled") + ">Pausar</button>" +
        '<button type="button" class="btn-end" data-act="timer-finish"' + (canFinish ? "" : " disabled") + ">Finalizar</button>" +
      "</div>" +
    "</div>"
  );
}

function backIcon() {
  return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
}

function renderPlan() {
  var finished = doneCount();
  var sections = [
    [1, 7, "Semana 1", "Adaptação"],
    [8, 14, "Semana 2", "Construção"],
    [15, 21, "Semana 3", "Resistência"],
    [22, 28, "Semana 4", "Evolução"],
    [29, 30, "Desafio final", "Medir de novo"]
  ];
  var html = sections.map(function (section) {
    var cells = "";
    for (var day = section[0]; day <= section[1]; day += 1) {
      var date = iso(addDays(startDate(), day - 1));
      var current = parseISO(date);
      var classes = ["day"];
      if (isDone(date)) classes.push("done");
      if (date === todayIso()) classes.push("today");
      if (date === activeIso()) classes.push("sel");
      cells += '<button type="button" class="' + classes.join(" ") + '" data-act="open-day" data-date="' + date + '">' +
        "<b>" + day + "</b><span>" + WEEKDAYS_SHORT[current.getDay()] + "</span></button>";
    }
    return '<div class="section-head"><h2>' + section[2] + "</h2><span>" + section[3] + "</span></div>" +
      '<div class="days">' + cells + "</div>";
  }).join("");
  shell(
    '<div class="wrap">' + brand("Operação 30") + "<h1>30 dias</h1>" +
    '<div class="bar"><span style="width:' + (finished / 30 * 100) + '%"></span></div>' +
    '<p class="bar-label">' + finished + ' de 30 dias concluídos. Toque num dia para abrir o treino.</p>' +
    html +
    '<p class="safety">O verde preenchido é dia feito. A borda branca marca hoje.</p></div>'
  );
}

function renderEvo() {
  var latest = lastWeight();
  var first = firstWeight();
  var bmi = latest ? bmiValue(latest.kg, state.profile.heightCm) : null;
  var delta = "";
  if (first && latest && first.slot.id !== latest.slot.id) {
    var diff = latest.kg - first.kg;
    var sign = diff > 0 ? "+" : "";
    delta = '<p class="delta">' + sign + fmt1(diff) + " kg desde o início</p>";
  } else if (latest) {
    delta = '<p class="delta">Peso inicial: ' + fmt1(latest.kg) + " kg</p>";
  }
  var slots = OP.weights.map(function (slot) {
    var value = typeof state.weights[slot.id] === "number" ? String(state.weights[slot.id]).replace(".", ",") : "";
    return '<div class="slot"><div><label for="w-' + slot.id + '">' + slot.label + '</label><span class="hint">' + slot.hint + "</span></div>" +
      '<input id="w-' + slot.id + '" data-weight="' + slot.id + '" type="text" inputmode="decimal" placeholder="kg" value="' + esc(value) + '"></div>';
  }).join("");
  shell(
    '<div class="wrap">' + brand("Evolução") + "<h1>Como você está indo</h1>" +
    '<div class="card" id="bmi-box">' + bmiBox(bmi, latest) + "</div>" +
    '<div class="card" id="chart-box">' + delta + chartHTML() + "</div>" +
    "<h2>Peso de cada semana</h2>" +
    '<p class="lead">Use vírgula ou ponto. O IMC usa o peso mais recente e a altura do perfil.</p>' +
    slots +
    "<h2>Medidas do dia 1 e do dia 30</h2>" +
    '<p class="lead">Tire também uma foto de frente e de lado e guarde no celular. O peso sozinho não conta a história.</p>' +
    measureTable() +
    '<div id="measure-delta">' + measureDelta() + "</div>" +
    "</div>"
  );
  bindEvo();
}

function bmiBox(bmi, latest) {
  if (!bmi || !latest) {
    return "<h2>IMC</h2><p>Preencha o peso de início para ver o cálculo.</p>";
  }
  var initial = state.weights["0"];
  var initialBmi = typeof initial === "number" ? bmiValue(initial, state.profile.heightCm) : null;
  var extra = initialBmi && latest.slot.id !== "0"
    ? '<p class="small muted">No início estava ' + fmt1(initialBmi) + ".</p>"
    : "";
  return '<p class="small muted">IMC com o peso de ' + esc(latest.slot.label.toLowerCase()) + "</p>" +
    '<div class="bmi-num">' + fmt1(bmi) + "</div><p>" + bmiLabel(bmi) + "</p>" +
    extra +
    '<p class="small muted">Conta: ' + fmt1(latest.kg) + " kg ÷ (" + fmtMeters(state.profile.heightCm) + " m)². Idade registrada: " +
    state.profile.age + " anos. O IMC não separa músculo de gordura.</p>";
}

function chartHTML() {
  var points = OP.weights.map(function (slot, index) {
    return { index: index, kg: state.weights[slot.id], short: slot.short };
  }).filter(function (point) { return typeof point.kg === "number"; });
  if (points.length < 2) {
    return '<p class="muted">Lance o peso da próxima semana para ver a linha.</p>';
  }
  var width = 360;
  var height = 210;
  var left = 16;
  var right = 16;
  var top = 24;
  var bottom = 36;
  var min = Math.min.apply(null, points.map(function (point) { return point.kg; }));
  var max = Math.max.apply(null, points.map(function (point) { return point.kg; }));
  var pad = Math.max(0.4, (max - min) * 0.35);
  var lo = min - pad;
  var hi = max + pad;
  var x = function (index) { return left + (index / 4) * (width - left - right); };
  var y = function (kg) { return top + (1 - (kg - lo) / (hi - lo)) * (height - top - bottom); };
  var drawn = points.map(function (point) {
    return { x: x(point.index), y: y(point.kg), kg: point.kg };
  });
  var path = drawn.map(function (point, index) {
    return (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1);
  }).join(" ");
  var dots = drawn.map(function (point) {
    return '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4.5" fill="#3ddc84"></circle>' +
      '<text x="' + point.x.toFixed(1) + '" y="' + (point.y - 10).toFixed(1) + '" text-anchor="middle" fill="#f5f7f6" font-size="11">' + fmt1(point.kg) + "</text>";
  }).join("");
  var labels = OP.weights.map(function (slot, index) {
    return '<text x="' + x(index).toFixed(1) + '" y="' + (height - 12) + '" text-anchor="middle" fill="#9aa89f" font-size="11">' + slot.short + "</text>";
  }).join("");
  return '<svg class="chart" viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="Linha da evolução do peso">' +
    '<path d="' + path + '" fill="none" stroke="#3ddc84" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></path>' +
    dots + labels + "</svg>";
}

function measureTable() {
  var rows = [
    ["waist", "Cintura no umbigo (cm)"],
    ["pushups", "Flexões inclinadas seguidas"],
    ["plank", "Prancha com joelhos (segundos)"]
  ];
  return rows.map(function (row) {
    return '<div class="field"><label>' + row[1] + "</label><div class=\"row-2\">" +
      measureInput("start", row[0], "Dia 1") +
      measureInput("end", row[0], "Dia 30") +
      "</div></div>";
  }).join("");
}

function measureInput(when, key, placeholder) {
  var raw = state.measures[when][key];
  var value = typeof raw === "number" ? String(raw).replace(".", ",") : "";
  return '<input data-measure="' + when + ":" + key + '" type="text" inputmode="decimal" placeholder="' + placeholder + '" value="' + esc(value) + '">';
}

function measureDelta() {
  var lines = [
    ["waist", "Cintura", "cm"],
    ["pushups", "Flexões inclinadas", ""],
    ["plank", "Prancha", "s"]
  ].map(function (item) {
    var a = state.measures.start[item[0]];
    var b = state.measures.end[item[0]];
    if (typeof a !== "number" || typeof b !== "number") return "";
    var diff = b - a;
    var sign = diff > 0 ? "+" : "";
    return "<p>" + item[1] + ": " + sign + fmt1(diff) + (item[2] ? " " + item[2] : "") + "</p>";
  }).join("");
  return lines ? '<div class="card">' + lines + "</div>" : "";
}

function bindEvo() {
  app.querySelectorAll("[data-weight]").forEach(function (input) {
    input.addEventListener("change", function () {
      var id = input.getAttribute("data-weight");
      var text = input.value.trim();
      if (!text) delete state.weights[id];
      else {
        var number = parseNum(text);
        if (!Number.isFinite(number) || number < 30 || number > 300) {
          input.value = typeof state.weights[id] === "number" ? String(state.weights[id]).replace(".", ",") : "";
          return;
        }
        state.weights[id] = Math.round(number * 10) / 10;
      }
      save();
      var latest = lastWeight();
      var bmi = latest ? bmiValue(latest.kg, state.profile.heightCm) : null;
      document.getElementById("bmi-box").innerHTML = bmiBox(bmi, latest);
      var first = firstWeight();
      var delta = "";
      if (first && latest && first.slot.id !== latest.slot.id) {
        var diff = latest.kg - first.kg;
        delta = '<p class="delta">' + (diff > 0 ? "+" : "") + fmt1(diff) + " kg desde o início</p>";
      } else if (latest) {
        delta = '<p class="delta">Peso inicial: ' + fmt1(latest.kg) + " kg</p>";
      }
      document.getElementById("chart-box").innerHTML = delta + chartHTML();
    });
  });
  app.querySelectorAll("[data-measure]").forEach(function (input) {
    input.addEventListener("change", function () {
      var parts = input.getAttribute("data-measure").split(":");
      var text = input.value.trim();
      if (!text) delete state.measures[parts[0]][parts[1]];
      else {
        var number = parseNum(text);
        if (!Number.isFinite(number) || number < 0 || number > 500) return;
        state.measures[parts[0]][parts[1]] = Math.round(number * 10) / 10;
      }
      save();
      document.getElementById("measure-delta").innerHTML = measureDelta();
    });
  });
}

function renderMe() {
  var profile = state.profile;
  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var install = standalone
    ? "Este atalho já está na tela inicial. Os dados ficam neste celular."
    : ios
      ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
      : "No Chrome, abra o menu do navegador e toque em Adicionar à tela inicial.";
  shell(
    '<div class="wrap">' + brand("Perfil") + "<h1>" + esc(profile.name || "Seu perfil") + "</h1>" +
    '<p class="lead">' + profile.age + " anos · " + fmtPlain(profile.heightCm) + " cm</p>" +
    '<form id="profile-form">' +
      fieldFilled("Nome", "p-name", "text", profile.name || "") +
      fieldFilled("Idade", "p-age", "numeric", String(profile.age)) +
      fieldFilled("Altura (cm)", "p-height", "decimal", String(profile.heightCm).replace(".", ",")) +
      fieldFilled("Data de início", "p-start", "date", profile.startDate) +
      '<p class="error" id="p-err"></p>' +
      '<button class="primary" type="submit">Salvar perfil</button>' +
    "</form>" +
    '<div class="switch-row"><div><strong>Sons do cronômetro</strong><p class="small muted">Toque de início, aviso final e vibração.</p></div>' +
    '<button type="button" class="switch' + (state.sound ? " on" : "") + '" data-act="toggle-sound" role="switch" aria-checked="' + state.sound + '" aria-label="Sons do cronômetro"><i></i></button></div>' +
    '<div class="card"><strong>Usar no celular</strong><p class="small" style="margin-top:8px">' + install + "</p></div>" +
    "<details><summary>Como sentir o ritmo da bicicleta</summary><ul>" +
      "<li>Leve: você conversa normalmente.</li>" +
      "<li>Moderada: a respiração acelera, mas a conversa continua.</li>" +
      "<li>Nas duas primeiras semanas, fique entre leve e moderada.</li>" +
    "</ul></details>" +
    "<details><summary>Alimentação para acompanhar</summary><ul>" +
      "<li>Inclua ovo, frango, peixe ou outra proteína nas refeições.</li>" +
      "<li>Diminua refrigerante e bebida açucarada.</li>" +
      "<li>Reduza fritura e excesso de doce.</li>" +
      "<li>Coma verdura, legume e fruta.</li>" +
      "<li>Beba água ao longo do dia.</li>" +
      "<li>Evite dieta muito restritiva.</li>" +
    "</ul><p class=\"small muted\">A gordura não sai só da barriga. A redução acontece no corpo todo.</p></details>" +
    '<p class="safety">Este app organiza o seu plano. Ele não substitui um médico nem um profissional de educação física. Se houver dor no peito, tontura ou falta de ar fora do comum, interrompa.</p>' +
    '<button type="button" class="linkish" data-act="reset">Apagar dados deste celular</button>' +
    "</div>"
  );
  var start = document.getElementById("p-start");
  if (start) start.value = profile.startDate;
}

function fieldFilled(label, id, mode, value) {
  var type = mode === "date" ? "date" : "text";
  var inputMode = mode === "numeric" || mode === "decimal" ? ' inputmode="' + mode + '"' : "";
  return '<div class="field"><label for="' + id + '">' + label + "</label>" +
    '<input id="' + id + '" type="' + type + '"' + inputMode + ' value="' + esc(value) + '" autocomplete="off"></div>';
}

function saveProfile() {
  var age = parseNum(document.getElementById("p-age").value);
  var height = parseNum(document.getElementById("p-height").value);
  var start = document.getElementById("p-start").value;
  var error = validateBody(age, height, null);
  if (!error && !start) error = "Escolha a data de início.";
  var box = document.getElementById("p-err");
  if (error) {
    box.textContent = error;
    return;
  }
  state.profile.name = document.getElementById("p-name").value.trim();
  state.profile.age = Math.round(age);
  state.profile.heightCm = Math.round(height * 10) / 10;
  state.profile.startDate = start;
  save();
  focusIso = null;
  box.textContent = "Perfil salvo.";
}

function openVideo(exId) {
  var exercise = OP.exercises[exId];
  if (!exercise) return;
  if (timer.phase === "run" || timer.phase === "switch") pauseTimer();
  var src = "https://www.youtube-nocookie.com/embed/" + exercise.video + "?rel=0&modestbranding=1&playsinline=1";
  var watch = "https://www.youtube.com/watch?v=" + exercise.video;
  var search = "https://www.youtube.com/results?search_query=" + encodeURIComponent(exercise.search);
  sheet.hidden = false;
  sheet.innerHTML =
    '<div class="sheet-card" role="dialog" aria-modal="true" aria-label="' + esc(exercise.videoTitle) + '">' +
      '<div class="sheet-top"><h2>' + esc(exercise.videoTitle) + '</h2>' +
      '<button type="button" class="icon-btn" data-act="close-video" aria-label="Fechar">×</button></div>' +
      '<div class="video-frame"><iframe src="' + src + '" title="' + esc(exercise.videoTitle) + '" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' +
      "<p>" + esc(exercise.cue) + "</p>" +
      (exercise.videoNote ? '<p class="small muted">' + esc(exercise.videoNote) + "</p>" : "") +
      '<p class="small">O vídeo precisa de internet. <a href="' + watch + '" target="_blank" rel="noopener">Abrir no YouTube</a> · <a href="' + search + '" target="_blank" rel="noopener">ver outros</a></p>' +
    "</div>";
}

function closeVideo() {
  sheet.hidden = true;
  sheet.innerHTML = "";
}

function onClick(event) {
  var button = event.target.closest("[data-act]");
  if (!button) return;
  var act = button.getAttribute("data-act");
  if (act === "nav" || act === "goto") {
    view = button.getAttribute("data-view");
    render();
    return;
  }
  if (act === "toggle-sound") {
    state.sound = !state.sound;
    save();
    render();
    return;
  }
  if (act === "back-today") {
    var today = todayIso();
    focusIso = today >= state.profile.startDate && today <= endIso() ? today : null;
    view = "today";
    render();
    return;
  }
  if (act === "open-day") {
    focusIso = button.getAttribute("data-date");
    view = "today";
    render();
    return;
  }
  if (act === "check") {
    var date = button.getAttribute("data-date");
    var index = Number(button.getAttribute("data-index"));
    setChecked(date, index, !checked(date, index));
    save();
    if (navigator.vibrate) navigator.vibrate(12);
    render();
    return;
  }
  if (act === "open-timer") {
    openTimer(button.getAttribute("data-date"), Number(button.getAttribute("data-index")), false);
    return;
  }
  if (act === "start-workout") {
    var current = activeIso();
    var blocks = workoutOf(current).blocks;
    var next = 0;
    for (var i = 0; i < blocks.length; i += 1) {
      if (!checked(current, i)) {
        next = i;
        break;
      }
    }
    openTimer(current, next, true);
    return;
  }
  if (act === "video") {
    openVideo(button.getAttribute("data-ex"));
    return;
  }
  if (act === "timer-start") startRun();
  if (act === "timer-pause") pauseTimer();
  if (act === "timer-finish") {
    if (timer.phase === "idle") timer.phase = "pause";
    finishBlock();
  }
  if (act === "timer-back") leaveTimer();
  if (act === "water-glass") {
    var waterDate = todayIso();
    var plan = waterPlan(waterDate);
    if (!plan) return;
    var list = drunkList(waterDate, plan.count);
    var glassIndex = Number(button.getAttribute("data-index"));
    setGlass(waterDate, glassIndex, !list[glassIndex]);
    save();
    paintWater();
    updateWaterBadge(plan, waterDate);
    if (navigator.vibrate) navigator.vibrate(12);
    return;
  }
  if (act === "water-on") {
    enableWaterReminders();
    return;
  }
  if (act === "water-off") {
    ensureWater();
    state.water.on = false;
    save();
    if (waterTimer) clearTimeout(waterTimer);
    if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {});
    paintWater();
    return;
  }
  if (act === "reset") {
    if (!confirm("Apagar o perfil, os treinos e os pesos salvos neste celular?")) return;
    if (waterSyncTimer) clearTimeout(waterSyncTimer);
    if (state.water) state.water.on = false;
    syncWaterPush();
    localStorage.removeItem(KEY);
    if (window.indexedDB) deleteWaterRecord();
    state = blank();
    focusIso = null;
    timer.phase = "idle";
    timer.running = false;
    view = "setup";
    render();
  }
}

app.addEventListener("click", onClick);
app.addEventListener("change", function (event) {
  if (event.target.id !== "water-from" && event.target.id !== "water-to") return;
  ensureWater();
  var from = document.getElementById("water-from");
  var to = document.getElementById("water-to");
  if (from && from.value) state.water.from = from.value;
  if (to && to.value) state.water.to = to.value;
  var waterDate = todayIso();
  state.water.sent[waterDate] = {};
  save();
  paintWater();
  var plan = waterPlan(waterDate);
  if (state.water.on && plan) scheduleSystemWater(waterDate, plan);
  armWater();
});
app.addEventListener("submit", function (event) {
  event.preventDefault();
  if (event.target.id === "setup-form") submitSetup();
  if (event.target.id === "profile-form") saveProfile();
});

sheet.addEventListener("click", function (event) {
  if (event.target === sheet || event.target.closest("[data-act='close-video']")) closeVideo();
});

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible" && timer.phase === "run") lockScreen();
  if (document.visibilityState === "visible") pullWaterMirror().then(function () { armWater(); });
});

setInterval(tick, 200);

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  var refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  navigator.serviceWorker.register("sw.js").catch(function () {});
}

if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", function (event) {
    if (!event.data) return;
    if (event.data.type === "water-check") armWater();
    if (event.data.type === "water-sync") pullWaterMirror();
  });
}

function hideNetlifyBadge() {
  var frame = document.getElementById("nl-badge-frame");
  if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
}

hideNetlifyBadge();
if (window.MutationObserver) {
  new MutationObserver(hideNetlifyBadge).observe(document.documentElement, { childList: true, subtree: true });
}

render();
pullWaterMirror().then(function () {
  armWater();
  queueWaterSync();
});
