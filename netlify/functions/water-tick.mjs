import { createRequire } from "node:module";
import { getStore } from "@netlify/blobs";
import { pickDue } from "../lib/water-schedule.mjs";

var require = createRequire(import.meta.url);
var webpush = require("web-push");

export const config = {
  schedule: "*/5 * * * *"
};

function vapidReady() {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
}

function payloadFor(decision) {
  var number = decision.due.index + 1;
  return JSON.stringify({
    title: "Hora da água",
    body: "Copo " + number + " de " + decision.count + ". " + decision.glass + " ml. Toque em Bebi para marcar.",
    data: {
      date: decision.date,
      index: decision.due.index,
      count: decision.count,
      glass: decision.glass
    }
  });
}

export default async function handler() {
  if (!vapidReady()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:calistenia30@netlify.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  var store = getStore("water-reminders");
  var saved = await store.get("devices", { type: "json", consistency: "strong" });
  var devices = (saved && saved.devices) || {};
  var ids = Object.keys(devices);
  if (!ids.length) return;
  var now = Date.now();
  var removed = {};
  var updates = [];
  for (var i = 0; i < ids.length; i += 1) {
    var id = ids[i];
    var device = devices[id];
    if (!device || device.on === false) continue;
    if (device.updatedAt && now - device.updatedAt > 45 * 24 * 60 * 60 * 1000) {
      removed[id] = true;
      continue;
    }
    var decision = pickDue(device, now);
    if (!decision || !decision.due) continue;
    try {
      await webpush.sendNotification({
        endpoint: device.endpoint,
        keys: device.keys
      }, payloadFor(decision), { TTL: 60 * 60 });
    } catch (error) {
      var code = error && (error.statusCode || error.status);
      if (code === 404 || code === 410) removed[id] = true;
      continue;
    }
    updates.push({ id: id, date: decision.date, mark: decision.mark });
  }
  if (!updates.length && !Object.keys(removed).length) return;
  var fresh = await store.get("devices", { type: "json", consistency: "strong" });
  var next = (fresh && fresh.devices) || {};
  Object.keys(removed).forEach(function (id) { delete next[id]; });
  updates.forEach(function (update) {
    if (!next[update.id]) return;
    next[update.id].sent = next[update.id].sent || {};
    next[update.id].sent[update.date] = next[update.id].sent[update.date] || {};
    update.mark.forEach(function (index) {
      next[update.id].sent[update.date][index] = true;
    });
  });
  await store.setJSON("devices", { devices: next });
}
