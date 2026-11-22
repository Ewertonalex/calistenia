var OP = {
  weeks: [
    null,
    { name: "Adaptação", level: "Leve", line: "Aprender o movimento, respirar e criar o hábito." },
    { name: "Construção", level: "Moderada", line: "Quando a forma estiver boa, faça 2 repetições a mais." },
    { name: "Resistência", level: "Moderada+", line: "Prancha mais longa e bicicleta com mais disposição." },
    { name: "Evolução", level: "Progressiva", line: "Aumente aos poucos, sem chegar à exaustão." }
  ],
  weights: [
    { id: "0", label: "Início", hint: "Peso do dia 1", short: "Início" },
    { id: "1", label: "Semana 1", hint: "Depois do 7º dia", short: "S1" },
    { id: "2", label: "Semana 2", hint: "Depois do 14º dia", short: "S2" },
    { id: "3", label: "Semana 3", hint: "Depois do 21º dia", short: "S3" },
    { id: "4", label: "Dia 30", hint: "Peso do fechamento", short: "D30" }
  ],
  exercises: {
    bike: {
      name: "Bicicleta",
      cue: "Banco na altura do quadril. No ponto de baixo, o joelho fica levemente dobrado. Ombros soltos e coluna neutra.",
      video: "NwwDBARCGgo",
      videoTitle: "Como usar a bicicleta ergométrica",
      videoNote: "Vídeo em inglês: mostra a altura do banco e a postura. O ritmo de hoje está escrito no treino.",
      search: "como pedalar na bicicleta ergométrica iniciante"
    },
    incline: {
      name: "Flexão inclinada",
      cue: "Mãos na parede, um pouco mais abertas que os ombros. Dê um passo atrás e deixe o corpo reto. O peito desce na direção da parede e você empurra de volta.",
      video: "gvoTIZGmcFY",
      videoTitle: "Como fazer flexão inclinada",
      videoNote: "Faça na parede, em pé. Quanto mais os pés perto da parede, mais fácil.",
      search: "flexão inclinada na parede como fazer"
    },
    kneePush: {
      name: "Flexão com joelhos",
      cue: "Joelhos no chão e corpo reto da cabeça aos joelhos. Desça o peito e empurre. Cotovelos apontam para trás, não abertos para os lados.",
      video: "rsbq8DwZEGg",
      videoTitle: "Flexão com joelhos apoiados",
      videoNote: "",
      search: "flexão de braço com joelhos apoiados"
    },
    row: {
      name: "Remada deitada",
      cue: "Deite de bruços, testa virada para o chão e cotovelos dobrados, no formato de um W. Junte as escápulas e levante só os cotovelos um pouco. Quadril e pernas ficam no chão. Não arqueie a lombar.",
      video: "CL-lV9E94Fs",
      videoTitle: "Remada deitada no chão",
      videoNote: "Em inglês. De bruços, puxe os cotovelos para trás e junte as escápulas. Só o chão.",
      search: "remada deitada no chão sem equipamento"
    },
    plank: {
      name: "Prancha com joelhos",
      cue: "Joelhos e mãos no chão. Corpo reto, abdômen firme. Não deixe o quadril cair nem subir. Respire durante a sustentação.",
      video: "FoViT_cIPQg",
      videoTitle: "Prancha ajoelhada",
      videoNote: "",
      search: "prancha com joelhos apoiados como fazer"
    },
    squat: {
      name: "Agachamento",
      cue: "Pés na largura do quadril. Mande o quadril para trás, como se fosse sentar. Os joelhos acompanham a ponta dos pés.",
      video: "8uoaYwS6iFM",
      videoTitle: "Agachamento com o peso do corpo",
      videoNote: "Em inglês. O movimento é só com o corpo, sem barra.",
      search: "agachamento com peso do corpo para iniciante"
    },
    calf: {
      name: "Elevação de panturrilha",
      cue: "Em pé, segure numa parede se precisar. Suba na ponta dos pés, pause em cima e desça devagar.",
      video: "pJ4JFIajxFs",
      videoTitle: "Panturrilha em pé",
      videoNote: "",
      search: "elevação de panturrilha em pé como fazer"
    },
    bridge: {
      name: "Ponte de glúteos",
      cue: "Deite com os joelhos dobrados e os pés no chão. Empurre os calcanhares, suba o quadril e aperte os glúteos. Não arqueie a lombar.",
      video: "wPM8icPu6H8",
      videoTitle: "Ponte de glúteos",
      videoNote: "Em inglês. Faça com os dois pés no chão. A variação de uma perna aparece no final.",
      search: "ponte de glúteos como fazer no chão"
    },
    crunch: {
      name: "Abdominal curto",
      cue: "Deite com os joelhos dobrados. Suba só os ombros. A lombar continua no chão. Não puxe o pescoço.",
      video: "KiKZsrjYuU4",
      videoTitle: "Abdominal curto no solo",
      videoNote: "",
      search: "abdominal curto no solo como fazer"
    },
    deadbug: {
      name: "Dead bug",
      cue: "Deite, braços para o teto e joelhos a 90 graus. Desça um braço e a perna oposta ao mesmo tempo. A lombar fica colada no chão.",
      video: "4XLEnwUr1d8",
      videoTitle: "Dead bug",
      videoNote: "Narração em inglês. O ponto principal é não deixar a lombar sair do chão.",
      search: "dead bug exercício abdominal como fazer"
    },
    march: {
      name: "Polichinelo sem salto",
      cue: "Marche no lugar, sem sair do chão em salto. Os joelhos sobem, os braços acompanham e o tronco fica ereto.",
      video: "u1gmWFvEluM",
      videoTitle: "Marcha no lugar",
      videoNote: "Em inglês. Marche sem sair do chão. Os joelhos sobem para a frente.",
      search: "marcha no lugar sem pulo exercício"
    },
    mobility: {
      name: "Mobilidade",
      cue: "Em pé, faça círculos lentos com os ombros. Depois, mãos na cintura e círculos com o quadril. Movimento confortável, sem dor.",
      video: "dERa5jKsrZ4",
      videoTitle: "Mobilidade de quadril e ombros",
      videoNote: "Em inglês. Faça os círculos de ombro e os de quadril, devagar e sem dor.",
      search: "mobilidade de quadril e ombros para iniciante"
    },
    stretch: {
      name: "Alongamento leve",
      cue: "Alongue peito, posterior da coxa e quadril. Segure cada posição sem dor, respirando fundo.",
      video: "0t5qTEDSGP4",
      videoTitle: "Alongamento de peito, quadril e posterior",
      videoNote: "Em inglês. Use o alongamento de peito na parede, o quadril e o posterior da coxa. Segure sem dor.",
      search: "alongamento leve para iniciante em casa"
    },
    walk: {
      name: "Caminhada tranquila",
      cue: "Caminhe pela casa sem pressa. Se preferir, pedale no ritmo mais leve da bicicleta.",
      video: "bO6NNfX_1ns",
      videoTitle: "Caminhada em casa",
      videoNote: "Em inglês. Caminhe no seu ritmo. Se preferir a bicicleta, use o vídeo de postura do pedal.",
      search: "caminhada leve em casa"
    }
  },
  workouts: [
    {
      title: "Recuperação",
      focus: "Mobilidade, alongamento e caminhada",
      blocks: [
        { ex: "mobility", sec: 300, dose: { kind: "note", text: "Círculos lentos de ombro e de quadril. Sem forçar." } },
        { ex: "stretch", sec: 300, dose: { kind: "note", text: "Segure cada alongamento cerca de 20 segundos, sem dor." } },
        { ex: "walk", label: "Caminhada ou pedal bem leve", sec: 300, dose: { kind: "note", text: "Sem buscar cansaço. Hoje é para recuperar." } }
      ]
    },
    {
      title: "Peito, costas e braços",
      focus: "Força de cima, remada e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "incline", sec: 120, dose: { kind: "sets", sets: 2, reps: 8, work: 40, rest: 40 } },
        { ex: "kneePush", sec: 120, dose: { kind: "sets", sets: 2, reps: 6, work: 40, rest: 40 } },
        { ex: "row", sec: 120, dose: { kind: "sets", sets: 2, reps: 8, work: 40, rest: 40 } },
        { ex: "plank", sec: 120, dose: { kind: "plank" } },
        { ex: "bike", label: "Bicicleta moderada", sec: 180, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 120, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Pernas e glúteos",
      focus: "Força de baixo e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "squat", sec: 120, dose: { kind: "sets", sets: 2, reps: 10, work: 40, rest: 40 } },
        { ex: "calf", sec: 120, dose: { kind: "sets", sets: 2, reps: 12, work: 40, rest: 40 } },
        { ex: "bridge", sec: 120, dose: { kind: "sets", sets: 2, reps: 10, work: 40, rest: 40 } },
        { ex: "bike", label: "Bicicleta moderada", sec: 300, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 120, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Abdômen e core",
      focus: "Centro do corpo e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "crunch", sec: 120, dose: { kind: "sets", sets: 2, reps: 10, work: 40, rest: 40 } },
        { ex: "deadbug", sec: 120, dose: { kind: "sets", sets: 2, reps: 8, work: 40, rest: 40 } },
        { ex: "plank", sec: 120, dose: { kind: "plank" } },
        { ex: "bike", label: "Bicicleta moderada", sec: 300, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 120, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Condicionamento",
      focus: "Bicicleta e movimento contínuo",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "bike", label: "Intervalos na bicicleta", sec: 360, dose: { kind: "interval" } },
        { ex: "march", sec: 120, dose: { kind: "note", text: "Sem salto. Marche no ritmo em que ainda consegue falar." } },
        { ex: "squat", label: "Agachamento leve", sec: 120, dose: { kind: "note", text: "Desça pouco e sem pressa, só para soltar as pernas.", progress: true } },
        { ex: "bike", label: "Bicicleta leve", sec: 180, dose: { kind: "bike", level: "leve" } }
      ]
    },
    {
      title: "Corpo inteiro",
      focus: "Força geral e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 90, dose: { kind: "bike", level: "leve" } },
        { ex: "incline", sec: 90, dose: { kind: "sets", sets: 2, reps: 6, work: 30, rest: 30 } },
        { ex: "row", sec: 90, dose: { kind: "sets", sets: 2, reps: 6, work: 30, rest: 30 } },
        { ex: "squat", sec: 90, dose: { kind: "sets", sets: 2, reps: 8, work: 30, rest: 30 } },
        { ex: "bridge", sec: 90, dose: { kind: "sets", sets: 2, reps: 8, work: 30, rest: 30 } },
        { ex: "deadbug", sec: 90, dose: { kind: "sets", sets: 2, reps: 6, work: 30, rest: 30 } },
        { ex: "bike", label: "Bicicleta moderada", sec: 180, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 180, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Resistência e mobilidade",
      focus: "Pedal contínuo e soltura",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 180, dose: { kind: "bike", level: "leve" } },
        { ex: "bike", label: "Bicicleta em ritmo confortável", sec: 480, dose: { kind: "bike", level: "conforto" } },
        { ex: "mobility", sec: 120, dose: { kind: "note", text: "Quadril e ombros, em círculos lentos." } },
        { ex: "stretch", sec: 120, dose: { kind: "note", text: "Alongue sem dor e respire fundo." } }
      ]
    }
  ]
};

(function () {
  OP.workouts.forEach(function (workout, index) {
    var sum = workout.blocks.reduce(function (total, block) { return total + block.sec; }, 0);
    if (sum !== 900) console.warn("Treino", index, "não soma 15 min:", sum);
    workout.blocks.forEach(function (block) {
      var dose = block.dose;
      if (!dose || dose.kind !== "sets") return;
      var total = dose.sets * dose.work + (dose.sets - 1) * dose.rest;
      if (total !== block.sec) console.warn("Treino", index, block.ex, "série e descanso não fecham", total);
    });
  });
})();
