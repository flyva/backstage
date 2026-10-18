import "server-only";

// Qui est en ligne, tous écrans confondus (pas que dans une conversation) : un ping client toutes les 30 s suffit à
// garder une personne "en ligne" ; sans ping depuis 60 s, elle redevient hors ligne. En mémoire seulement (sur
// globalThis pour survivre au rechargement à chaud en dev) : redémarrer l'appli remet tout le monde hors ligne.
const ONLINE_WINDOW_MS = 60_000;
const g = globalThis as unknown as { __onlineUsers?: Map<number, number> };
g.__onlineUsers ??= new Map();
const store = g.__onlineUsers;

export function markOnline(userId: number) {
  store.set(userId, Date.now());
}

export function isOnline(userId: number) {
  const t = store.get(userId);
  return !!t && Date.now() - t < ONLINE_WINDOW_MS;
}

export function onlineUserIds(ids: number[]): Set<number> {
  return new Set(ids.filter(isOnline));
}
