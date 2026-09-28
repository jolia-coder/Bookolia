/* Change le numéro de version à chaque mise à jour du site */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`, MEDIA = "media-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith("shell-") && k !== SHELL).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pages : réseau d'abord, cache si hors ligne
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { caches.open(SHELL).then(c => c.put("./index.html", r.clone())); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Fichiers de l'app
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // Couvertures et polices : gardées pour le mode hors ligne
  if (/covers\.openlibrary\.org|books\.google|googleusercontent|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(MEDIA).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
  // Recherche de livres : toujours en ligne
});
