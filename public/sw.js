const CACHE_NAME = "medicalequipes-pwa-v1";
const PRECACHE_ASSETS = [
  "/icon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-192x192.png",
  "/pwa-maskable-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("medicalequipes-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js"
  ) {
    return;
  }

  // Static Next.js build assets & public icons/images: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/pwa-") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Page navigations: network-first so auth cookies/proxy & live listings stay fresh
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (
            response &&
            response.ok &&
            !url.pathname.startsWith("/dashboard") &&
            !url.pathname.startsWith("/sell") &&
            !url.pathname.startsWith("/admin") &&
            !url.pathname.startsWith("/profile") &&
            !url.pathname.startsWith("/favorites") &&
            !url.pathname.startsWith("/requirement")
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const homeCached = await caches.match("/");
          if (homeCached) return homeCached;
          return new Response(
            "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><title>Offline | MedicalEquipes</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#e7f6f7;color:#102b33;padding:24px;text-align:center}.card{max-width:420px;background:#fff;padding:28px;border-radius:16px;border:1px solid #dbe7e9}h1{margin:0 0 10px;font-size:24px}p{margin:0;color:#526277;line-height:1.6}</style></head><body><div class=\"card\"><h1>You are offline</h1><p>MedicalEquipes could not reach the network. Please reconnect to browse live medical equipment listings.</p></div></body></html>",
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        })
    );
  }
});
