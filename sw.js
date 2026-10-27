/* Service worker: lưu app shell + danh mục + toàn bộ tài liệu để dùng ngoại tuyến.
   Tăng CACHE_VERSION mỗi khi đổi dữ liệu hoặc mã. */
var CACHE_VERSION = 'cph-hub-v1.0.0';
var RUNTIME = 'cph-runtime-v1';
var SHELL = [
  './',
  'index.html',
  'css/base.css',
  'css/theme.css',
  'js/core.js',
  'data/pages.json',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      var fresh = SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); });
      return cache.addAll(fresh).then(function () {
        return fetch('data/pages.json', { cache: 'no-cache' })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            // Từng tệp riêng lẻ: một tệp lỗi không làm hỏng cả lần cài đặt
            return Promise.all(d.records.map(function (rec) {
              return cache.add(new Request(encodeURI(rec.file), { cache: 'reload' })).catch(function () {});
            }));
          })
          .catch(function () {});
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE_VERSION && k !== RUNTIME;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Network-first cho tệp nội bộ: trực tuyến luôn lấy bản mới, ngoại tuyến dùng bản đã lưu
function networkFirst(request) {
  return caches.open(CACHE_VERSION).then(function (cache) {
    return fetch(request).then(function (resp) {
      if (resp && resp.ok) cache.put(request, resp.clone());
      return resp;
    }).catch(function () {
      return cache.match(request, { ignoreSearch: true }).then(function (cached) {
        return cached || (request.destination === 'document' ? cache.match('index.html') : Response.error());
      });
    });
  });
}

// Stale-while-revalidate cho font/CDN bên ngoài: trả bản đã lưu ngay, cập nhật ở nền
function swr(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(request).then(function (resp) {
        if (resp && (resp.ok || resp.type === 'opaque')) cache.put(request, resp.clone());
        return resp;
      }).catch(function () { return cached; });
      return cached || network;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  } else if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/.test(url.hostname)) {
    event.respondWith(swr(req, RUNTIME));
  }
});
