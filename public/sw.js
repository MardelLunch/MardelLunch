// Guarda la app en el celular para que abra sin internet.
const CACHE = "mardel-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/", "/index.html", "/mascota.png", "/manifest.webmanifest"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.match(req).then((guardado) => {
      const red = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => guardado || caches.match("/index.html"));
      return guardado || red;
    })
  );
});
