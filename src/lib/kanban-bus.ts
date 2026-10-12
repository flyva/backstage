import { EventEmitter } from "node:events";

// Canal interne : dès qu'une carte bouge, est ajoutée, modifiée, ou que les tâches/commentaires changent, les personnes
// qui ont le kanban ouvert sont prévenues et rafraîchissent (flux SSE, voir /api/projects/[id]/kanban/stream). Comme pour
// la messagerie, un simple EventEmitter suffit (un seul processus Node), rattaché à globalThis pour survivre au rechargement
// à chaud en développement.

const g = globalThis as unknown as { __kanbanBus?: EventEmitter };
const bus = (g.__kanbanBus ??= new EventEmitter());
bus.setMaxListeners(500);

export const emitKanban = (projectId: number) => bus.emit(`p${projectId}`, Date.now());

export function onKanban(projectId: number, fn: (at: number) => void): () => void {
  bus.on(`p${projectId}`, fn);
  return () => bus.off(`p${projectId}`, fn);
}
