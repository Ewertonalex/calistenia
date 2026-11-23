import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

var MAX_DEVICES = 8;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

function deviceId(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 24);
}

function cleanDrunk(input) {
  var out = {};
  if (!input || typeof input !== "object") return out;
  Object.keys(input).slice(0, 4).forEach(function (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (!Array.isArray(input[date])) return;
    out[date] = input[date].slice(0, 16).map(Boolean);
  });
  return out;
}

function pruneOld(map, today) {
  if (!map) return {};
  var cutoff = new Date(today + "T00:00:00Z");
  cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  var limit = cutoff.toISOString().slice(0, 10);
  var keep = {};
  Object.keys(map).forEach(function (date) {
    if (date >= limit) keep[date] = map[date];
  });
  return keep;
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ ok: false }, 405);
  var body;
  try {
    body = await req.json();
  } catch (error) {
    return json({ ok: false }, 400);
  }
  var sub = body && body.subscription;
  var endpoint = sub && sub.endpoint;
  var keys = sub && sub.keys;
  if (!endpoint || typeof endpoint !== "string" || endpoint.indexOf("https://") !== 0) return json({ ok: false }, 400);
  if (endpoint.length > 2000) return json({ ok: false }, 400);
  if (!keys || !keys.p256dh || !keys.auth) return json({ ok: false }, 400);

  var store = getStore("water-reminders");
  var saved = await store.get("devices", { type: "json", consistency: "strong" });
  var devices = (saved && saved.devices) || {};
  var id = deviceId(endpoint);

  if (body.on === false) {
    delete devices[id];
    await store.setJSON("devices", { devices: devices });
    return json({ ok: true });
  }

  var kg = Number(body.kg);
  var age = Number(body.age);
  var tz = Number(body.tzOffsetMinutes);
  var from = String(body.from || "08:00");
  var to = String(body.to || "21:00");
  if (!Number.isFinite(kg) || kg < 20 || kg > 400) return json({ ok: false }, 400);
  if (!Number.isFinite(age) || age < 10 || age > 120) return json({ ok: false }, 400);
  if (!Number.isFinite(tz) || tz < -840 || tz > 840) return json({ ok: false }, 400);
  if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) return json({ ok: false }, 400);

  var previous = devices[id] || {};
  var signature = [from, to, kg, age, tz].join("|");
  var today = new Date().toISOString().slice(0, 10);
  var drunk = Object.assign({}, previous.drunk || {}, cleanDrunk(body.drunk));
  devices[id] = {
    endpoint: endpoint,
    keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) },
    on: true,
    from: from,
    to: to,
    tzOffsetMinutes: tz,
    kg: kg,
    age: age,
    signature: signature,
    drunk: pruneOld(drunk, today),
    sent: previous.signature === signature ? pruneOld(previous.sent || {}, today) : {},
    updatedAt: Date.now()
  };

  var ids = Object.keys(devices);
  if (ids.length > MAX_DEVICES) {
    ids.sort(function (a, b) { return (devices[a].updatedAt || 0) - (devices[b].updatedAt || 0); });
    ids.forEach(function (oldId) {
      if (Object.keys(devices).length <= MAX_DEVICES) return;
      if (oldId === id) return;
      delete devices[oldId];
    });
  }

  await store.setJSON("devices", { devices: devices });
  return json({ ok: true });
}
