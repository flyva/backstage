"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { detenteScores, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { emitDetente, joinDetente, leaveDetente } from "@/lib/detente-bus";

/** « Prénom N. » : prénom entier, initiale du nom suivie d'un point. */
const shortName = (firstName: string, lastName: string) => `${firstName}${lastName ? ` ${lastName.charAt(0)}.` : ""}`;

/** Déclaré présent (ou absent) dans l'espace détente : voir detente-bus.ts. */
export async function setDetentePresence(present: boolean) {
  const user = await requireUser();
  if (present) joinDetente({ userId: user.id, name: user.name });
  else leaveDetente(user.id);
}

/** Enregistre un score de fin de partie, et le diffuse en direct à tout le monde présent. */
export async function saveDetenteScore(game: string, score: number) {
  const user = await requireUser();
  if (!Number.isInteger(score) || score < 0 || score > 1_000_000) return;
  if (!allow(`detente-score:${user.id}`, 30, 10 * 60e3)) return;
  const now = new Date();
  await db.insert(detenteScores).values({ userId: user.id, game, score, createdAt: now });
  emitDetente({ kind: "score", score: { userId: user.id, name: shortName(user.firstName, user.lastName), game, score, at: now.toISOString() } });
}

/** Les 10 meilleurs scores du jeu, et le dernier score de la personne connectée. Noms raccourcis « Prénom N. ». */
export async function loadScores(game: string) {
  const user = await requireUser();
  const [top, [mine]] = await Promise.all([
    db.select({ userId: detenteScores.userId, firstName: users.firstName, lastName: users.lastName, score: detenteScores.score, createdAt: detenteScores.createdAt })
      .from(detenteScores).innerJoin(users, eq(users.id, detenteScores.userId))
      .where(eq(detenteScores.game, game)).orderBy(desc(detenteScores.score)).limit(10),
    db.select({ score: detenteScores.score, createdAt: detenteScores.createdAt })
      .from(detenteScores).where(and(eq(detenteScores.game, game), eq(detenteScores.userId, user.id))).orderBy(desc(detenteScores.createdAt)).limit(1),
  ]);
  return { top: top.map((t) => ({ userId: t.userId, name: shortName(t.firstName, t.lastName), score: t.score, createdAt: t.createdAt })), mine: mine ?? null };
}
