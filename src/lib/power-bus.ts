import { EventEmitter } from "node:events";

// Canal interne : dès qu'une ligne ou un appareil de la Charge électrique d'un projet change, les personnes qui ont
// cette page ouverte sont prévenues et rafraîchissent (flux SSE, voir /api/projects/[id]/charge/stream). Même principe
// que le kanban (voir kanban-bus.ts) : un simple EventEmitter suffit (un seul processus Node), rattaché à globalThis
// pour survivre au rechargement à chaud en développement.

const g = globalThis as unknown as { __powerBus?: EventEmitter };
const bus = (g.__powerBus ??= new EventEmitter());
bus.setMaxListeners(500);

export const emitPower = (projectId: number) => bus.emit(`p${projectId}`, Date.now());

export function onPower(projectId: number, fn: (at: number) => void): () => void {
  bus.on(`p${projectId}`, fn);
  return () => bus.off(`p${projectId}`, fn);
}
