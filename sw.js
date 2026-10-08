// 大阪さんぽのしおり：オフラインでも開けるようにするための Service Worker
// index.html などを更新したら CACHE の番号を上げる
const CACHE = 'osaka-sanpo-v36';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon-32.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './fankit/cover.jpg',
  './fankit/stamp-1.png',
  './fankit/stamp-2.png',
  './fankit/stamp-3.png',
  './fankit/stamp-4.png',
  './fankit/stamp-5.png',
  './fankit/stamp-6.png',
  './fankit/stamp-7.png',
  './fankit/stamp-8.png',
  './fankit/stamp-complete.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // ページ本体：まずネットから最新を取り、だめならキャッシュ
  if (req.mode === 'navigate') {
    // しおり本体（./ と ./index.html）だけを扱う。PDF など別のページを開いたときは、ブラウザに任せる
    // （以前はどのページでも ./index.html として保存していたため、PDF を開くとオフライン用の本体が上書きされていた）
    const url = new URL(req.url);
    const scope = new URL(self.registration.scope);
    const isShell = url.origin === scope.origin &&
      (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');
    if (!isShell) return;
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            e.waitUntil(caches.open(CACHE).then((c) => c.put('./index.html', copy)));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // それ以外（フォント・アイコンなど）：キャッシュがあれば使い、なければ取りに行って保存
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
