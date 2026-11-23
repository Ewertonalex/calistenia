var WATER_DB_NAME = "operacao30";
var WATER_STORE = "kv";

function openWaterDb() {
  return new Promise(function (resolve, reject) {
    if (!self.indexedDB) {
      reject(new Error("sem indexedDB"));
      return;
    }
    var request = indexedDB.open(WATER_DB_NAME, 1);
    request.onupgradeneeded = function () {
      var db = request.result;
      if (!db.objectStoreNames.contains(WATER_STORE)) db.createObjectStore(WATER_STORE);
    };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

function readWaterRecord() {
  return openWaterDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(WATER_STORE, "readonly");
      var req = tx.objectStore(WATER_STORE).get("state");
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function writeWaterRecord(water) {
  return openWaterDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(WATER_STORE, "readwrite");
      tx.objectStore(WATER_STORE).put(water, "state");
      tx.oncomplete = function () { resolve(water); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function deleteWaterRecord() {
  return openWaterDb().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction(WATER_STORE, "readwrite");
      tx.objectStore(WATER_STORE).delete("state");
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { resolve(); };
    });
  }).catch(function () {});
}

function mergeMarkMaps(a, b) {
  var out = {};
  [a, b].forEach(function (map) {
    if (!map) return;
    Object.keys(map).forEach(function (date) {
      out[date] = out[date] || {};
      Object.keys(map[date] || {}).forEach(function (index) {
        var time = Number(map[date][index]) || 0;
        if (time > (Number(out[date][index]) || 0)) out[date][index] = time;
      });
    });
  });
  return out;
}

function mergeSent(a, b) {
  var out = {};
  [a, b].forEach(function (map) {
    if (!map) return;
    Object.keys(map).forEach(function (date) {
      out[date] = out[date] || {};
      var day = map[date];
      if (!day || typeof day !== "object") return;
      Object.keys(day).forEach(function (index) {
        if (day[index]) out[date][index] = true;
      });
    });
  });
  return out;
}

function applyWaterMarks(water) {
  water.marks = water.marks || {};
  water.clears = water.clears || {};
  water.drunk = water.drunk || {};
  water.sent = water.sent || {};
  Object.keys(water.drunk).forEach(function (date) {
    var list = water.drunk[date];
    if (!Array.isArray(list)) return;
    water.marks[date] = water.marks[date] || {};
    list.forEach(function (on, index) {
      if (on && !water.marks[date][index]) water.marks[date][index] = 1;
    });
  });
  var dates = {};
  Object.keys(water.marks).forEach(function (date) { dates[date] = true; });
  Object.keys(water.clears).forEach(function (date) { dates[date] = true; });
  Object.keys(dates).forEach(function (date) {
    var marks = water.marks[date] || {};
    var clears = water.clears[date] || {};
    var max = -1;
    Object.keys(marks).concat(Object.keys(clears)).forEach(function (index) {
      var n = Number(index);
      if (n > max) max = n;
    });
    var list = [];
    for (var i = 0; i <= max; i += 1) {
      list.push((Number(marks[i]) || 0) > (Number(clears[i]) || 0));
    }
    water.drunk[date] = list;
  });
  return water;
}

function markWaterGlass(water, date, index, count) {
  water = water || { on: true, from: "08:00", to: "21:00", drunk: {}, sent: {}, marks: {}, clears: {} };
  applyWaterMarks(water);
  var list = water.drunk[date] ? water.drunk[date].slice() : [];
  var total = Math.max(count || 0, list.length, 1);
  while (list.length < total) list.push(false);
  var target = Number(index);
  if (!Number.isFinite(target) || target < 0) {
    target = -1;
    for (var i = 0; i < list.length; i += 1) {
      if (!list[i]) {
        target = i;
        break;
      }
    }
  }
  if (target < 0 || list[target]) return { water: water, index: -1 };
  water.marks[date] = water.marks[date] || {};
  water.marks[date][target] = Date.now();
  water.sent[date] = water.sent[date] || {};
  water.sent[date][target] = true;
  applyWaterMarks(water);
  return { water: water, index: target };
}
