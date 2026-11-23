importScripts("js/water-db.js");

var CACHE = "op30-v9";
var FILES = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/data.js",
  "./js/water-db.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/favicon.ico",
  "./icons/favicon-16.png",
  "./icons/favicon-32.png",
  "./icons/mark-64.png",
  "./icons/logo.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function focusApp() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
    for (var i = 0; i < clients.length; i += 1) {
      if ("focus" in clients[i]) return clients[i].focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  });
}

function markGlassFromNotification(data) {
  var date = data && data.date;
  var index = data && Number(data.index);
  var count = data && Number(data.count);
  if (!date) return Promise.resolve();
  return readWaterRecord().then(function (stored) {
    var marked = markWaterGlass(stored, date, index, count);
    if (marked.index < 0) return marked;
    return writeWaterRecord(marked.water).then(function () { return marked; });
  }).then(function (marked) {
    if (!marked || marked.index < 0) return;
    var list = (marked.water.drunk && marked.water.drunk[date]) || [];
    var done = list.filter(Boolean).length;
    var total = count || list.length;
    var left = Math.max(0, total - done);
    if (navigator.setAppBadge) {
      var badge = left > 0 ? navigator.setAppBadge(left) : (navigator.clearAppBadge ? navigator.clearAppBadge() : Promise.resolve());
      if (badge && badge.catch) badge.catch(function () {});
    }
    return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: "water-sync" });
      });
    });
  });
}

self.addEventListener("notificationclick", function (event) {
  var data = event.notification.data || {};
  if (event.action === "bebido") {
    event.notification.close();
    event.waitUntil(markGlassFromNotification(data));
    return;
  }
  event.notification.close();
  event.waitUntil(focusApp());
});

self.addEventListener("periodicsync", function (event) {
  if (event.tag !== "agua") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: "water-check" });
      });
    })
  );
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(event.request, copy);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
