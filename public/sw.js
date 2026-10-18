// Service worker de Backstage.
// Volontairement minimal : il ne met JAMAIS en cache les pages personnelles, les API ni les médias (ils dépendent de
// la session) — sauf l'Agenda, mis en cache malgré tout car c'est la page la plus utile hors ligne (la dernière vue
// en ligne reste lisible). Autres exceptions, partagées par toute la promo (pas de donnée personnelle) : le wiki et
// le cours Habilitation électrique. Mis en cache après une première visite en ligne, pour rester lisibles hors
// connexion ensuite (mode avion, salle sans réseau…). Le reste du service worker gère l'installation, les fichiers
// statiques immuables, les pages « hors ligne » (dont le Jour J) et les notifications push.
const CACHE = "backstage-static-v3";
const PAGES_CACHE = "backstage-pages-v1";
const PRECACHE = ["/offline.html", "/jour-j-offline.html", "/icon-192.png"];

// Lecture seule : le wiki et Habilitation électrique (hors création/modification/historique/impression/export,
// jamais utiles hors ligne), et l'Agenda (personnel, mais le plus demandé hors connexion).
function isOfflineReadable(pathname) {
  if (/^\/wiki\/nouveau/.test(pathname)) return false;
  if (/^\/wiki\/[^/]+\/(modifier|historique|imprimer|export)/.test(pathname)) return false;
  if (/^\/wiki(\/|$)/.test(pathname)) return true;
  if (/^\/habilitation(\/|$)/.test(pathname)) return true;
  if (/^\/agenda(\/|$)/.test(pathname)) return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers Next.js hachés : immuables, donc cache d'abord.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  // Wiki et Habilitation : réseau d'abord (toujours à jour si une connexion est là), le cache ne sert que hors ligne.
  // Couvre à la fois la navigation complète et les requêtes React Server Components des clics internes (même URL).
  if (isOfflineReadable(url.pathname)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(PAGES_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/offline.html") : Response.error()))),
    );
    return;
  }

  // Navigation : réseau, avec page de secours si l'appareil est hors ligne. Le Jour J d'un projet a sa propre page de
  // secours (statique, sans donnée : elle lit la conduite enregistrée sur l'appareil quand il y avait du réseau).
  if (req.mode === "navigate") {
    const jourJ = /^\/projets\/\d+\/jour-j\/?$/.test(url.pathname);
    event.respondWith(fetch(req).catch(() => caches.match(jourJ ? "/jour-j-offline.html" : "/offline.html")));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* charge utile non JSON */ }
  const title = data.title || "Backstage";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.navigate(target);
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
