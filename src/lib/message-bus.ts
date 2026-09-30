import { EventEmitter } from "node:events";

// Canal interne : quand un message est enregistré, les personnes qui ont la conversation ouverte le reçoivent tout de suite
// (flux SSE, voir /api/messages/[id]/stream). Le site tourne dans un seul processus Node : un simple EventEmitter suffit.
// Il est rattaché à globalThis pour survivre au rechargement à chaud en développement.

export type LiveMessage = { id: number; senderId: number; body: string; createdAt: string };

const g = globalThis as unknown as { __msgBus?: EventEmitter };
const bus = (g.__msgBus ??= new EventEmitter());
bus.setMaxListeners(500);

export const emitMessage = (conversationId: number, m: LiveMessage) => bus.emit(`c${conversationId}`, m);

export function onMessage(conversationId: number, fn: (m: LiveMessage) => void): () => void {
  bus.on(`c${conversationId}`, fn);
  return () => bus.off(`c${conversationId}`, fn);
}

export const toLive = (m: { id: number; senderId: number; body: string; createdAt: Date }): LiveMessage => ({
  id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString(),
});
