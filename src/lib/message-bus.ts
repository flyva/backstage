import { EventEmitter } from "node:events";

// Canal interne : quand un message est enregistré, qu'une personne écrit ou qu'elle lit la conversation, les personnes qui l'ont
// ouverte le reçoivent tout de suite (flux SSE, voir /api/messages/[id]/stream). Le site tourne dans un seul processus Node :
// un simple EventEmitter suffit. Il est rattaché à globalThis pour survivre au rechargement à chaud en développement.

export type LiveMessage = { id: number; senderId: number; body: string; createdAt: string };

export type LiveEvent =
  | { kind: "message"; message: LiveMessage }
  | { kind: "typing"; userId: number } // la personne est en train d'écrire
  | { kind: "read"; userId: number; at: string }; // la personne vient de lire la conversation

const g = globalThis as unknown as { __msgBus?: EventEmitter };
const bus = (g.__msgBus ??= new EventEmitter());
bus.setMaxListeners(500);

export const emitEvent = (conversationId: number, e: LiveEvent) => bus.emit(`c${conversationId}`, e);
export const emitMessage = (conversationId: number, message: LiveMessage) => emitEvent(conversationId, { kind: "message", message });

export function onEvent(conversationId: number, fn: (e: LiveEvent) => void): () => void {
  bus.on(`c${conversationId}`, fn);
  return () => bus.off(`c${conversationId}`, fn);
}

export const toLive = (m: { id: number; senderId: number; body: string; createdAt: Date }): LiveMessage => ({
  id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString(),
});
