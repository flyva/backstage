import { EventEmitter } from "node:events";

// Canal interne : quand un message est enregistré, qu'une personne écrit ou qu'elle lit la conversation, les personnes qui l'ont
// ouverte le reçoivent tout de suite (flux SSE, voir /api/messages/[id]/stream). Le site tourne dans un seul processus Node :
// un simple EventEmitter suffit. Il est rattaché à globalThis pour survivre au rechargement à chaud en développement.

export type LiveMessage = { id: number; senderId: number; body: string; createdAt: string };

export type LiveEvent =
  | { kind: "message"; message: LiveMessage }
  | { kind: "typing"; userId: number } // la personne est en train d'écrire
  | { kind: "read"; userId: number; at: string }; // la personne vient de lire la conversation

const g = globalThis as unknown as { __msgBus?: EventEmitter; __msgPresence?: Map<number, Set<number>> };
const bus = (g.__msgBus ??= new EventEmitter());
bus.setMaxListeners(500);
// Qui a le flux de la conversation ouvert en ce moment (onglet au premier plan) : sert à ne pousser une notification
// que si la personne n'est pas déjà en train de regarder la conversation.
const presence = (g.__msgPresence ??= new Map<number, Set<number>>());

export const emitEvent = (conversationId: number, e: LiveEvent) => bus.emit(`c${conversationId}`, e);
export const emitMessage = (conversationId: number, message: LiveMessage) => emitEvent(conversationId, { kind: "message", message });

export function onEvent(conversationId: number, fn: (e: LiveEvent) => void): () => void {
  bus.on(`c${conversationId}`, fn);
  return () => bus.off(`c${conversationId}`, fn);
}

/** Déclaré présent tant que l'onglet est visible et connecté au flux ; à retirer à la fermeture de l'onglet ou son passage en arrière-plan. */
export function setPresent(conversationId: number, userId: number, present: boolean) {
  const set = presence.get(conversationId);
  if (present) {
    (set ?? presence.set(conversationId, new Set()).get(conversationId)!).add(userId);
  } else if (set) {
    set.delete(userId);
    if (set.size === 0) presence.delete(conversationId);
  }
}

export const isPresent = (conversationId: number, userId: number) => !!presence.get(conversationId)?.has(userId);

export const toLive = (m: { id: number; senderId: number; body: string; createdAt: Date }): LiveMessage => ({
  id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString(),
});
