import { EventEmitter } from "node:events";

// Canal de l'espace détente : qui joue en ce moment, et les scores au fur et à mesure qu'ils arrivent. Un seul salon
// partagé par tout le monde (pas de conversation à conversation comme la messagerie). Même principe que message-bus.ts :
// un EventEmitter en mémoire, rattaché à globalThis pour survivre au rechargement à chaud en développement.

export type Player = { userId: number; name: string };
export type LiveScore = { userId: number; name: string; game: string; score: number; at: string };

export type DetenteEvent =
  | { kind: "join"; player: Player }
  | { kind: "leave"; userId: number }
  | { kind: "score"; score: LiveScore };

const g = globalThis as unknown as { __detenteBus?: EventEmitter; __detentePlayers?: Map<number, Player> };
const bus = (g.__detenteBus ??= new EventEmitter());
bus.setMaxListeners(500);
const players = (g.__detentePlayers ??= new Map<number, Player>());

export const emitDetente = (e: DetenteEvent) => bus.emit("room", e);

export function onDetente(fn: (e: DetenteEvent) => void): () => void {
  bus.on("room", fn);
  return () => bus.off("room", fn);
}

export function joinDetente(player: Player) {
  players.set(player.userId, player);
  emitDetente({ kind: "join", player });
}

export function leaveDetente(userId: number) {
  if (players.delete(userId)) emitDetente({ kind: "leave", userId });
}

export const currentPlayers = (): Player[] => [...players.values()];
