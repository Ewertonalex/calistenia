// Mesma conta de js/app.js: ml por idade, extra do dia e copos de 250 ml.
export var WINDOW_MS = 80 * 60 * 1000;

export function mlPerKg(age) {
  if (age >= 56) return 30;
  if (age >= 31) return 33;
  return 35;
}

export function exerciseExtra(weekday) {
  if (weekday === 0) return 200;
  if (weekday === 6) return 350;
  return 500;
}

export function glassCount(kg, age, weekday) {
  var base = Math.round(kg * mlPerKg(age) / 100) * 100;
  var count = Math.ceil((base + exerciseExtra(weekday)) / 250);
  if (count < 6) count = 6;
  if (count > 16) count = 16;
  return count;
}

export function parseHM(value) {
  var parts = String(value || "08:00").split(":");
  var hour = Number(parts[0]);
  var minute = Number(parts[1]);
  return {
    h: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 8,
    m: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0
  };
}

export function localParts(nowMs, tzOffsetMinutes) {
  var shifted = new Date(nowMs - tzOffsetMinutes * 60 * 1000);
  var month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  var day = String(shifted.getUTCDate()).padStart(2, "0");
  return {
    date: shifted.getUTCFullYear() + "-" + month + "-" + day,
    weekday: shifted.getUTCDay()
  };
}

export function localToEpoch(date, hour, minute, tzOffsetMinutes) {
  var parts = String(date).split("-");
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), hour, minute, 0, 0) + tzOffsetMinutes * 60 * 1000;
}

export function slotsFor(date, from, to, count, tzOffsetMinutes) {
  var startHM = parseHM(from);
  var endHM = parseHM(to);
  var start = localToEpoch(date, startHM.h, startHM.m, tzOffsetMinutes);
  var end = localToEpoch(date, endHM.h, endHM.m, tzOffsetMinutes);
  if (end <= start) end = start + 12 * 60 * 60 * 1000;
  var span = end - start;
  var slots = [];
  for (var i = 0; i < count; i += 1) {
    var at = count === 1 ? start : start + Math.round(span * i / (count - 1));
    slots.push({ index: i, at: at });
  }
  return slots;
}

export function pickDue(device, nowMs) {
  if (!device || device.on === false) return null;
  var kg = Number(device.kg);
  var age = Number(device.age);
  if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(age)) return null;
  var tz = Number(device.tzOffsetMinutes);
  if (!Number.isFinite(tz)) tz = 180;
  var local = localParts(nowMs, tz);
  var count = glassCount(kg, age, local.weekday);
  var slots = slotsFor(local.date, device.from || "08:00", device.to || "21:00", count, tz);
  var drunk = Array.isArray(device.drunk && device.drunk[local.date]) ? device.drunk[local.date] : [];
  var sent = (device.sent && device.sent[local.date]) || {};
  var due = null;
  var mark = [];
  slots.forEach(function (slot) {
    if (slot.at > nowMs) return;
    mark.push(slot.index);
    if (drunk[slot.index] || sent[slot.index]) return;
    if (nowMs - slot.at <= WINDOW_MS) due = slot;
  });
  return {
    date: local.date,
    count: count,
    glass: 250,
    mark: mark,
    due: due
  };
}
