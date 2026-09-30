import "server-only";
import { and, avg, count, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, reviews } from "@/db/schema";

/** Note moyenne et nombre d'avis reçus par chaque personne. */
export async function ratingSummary(userIds: number[]): Promise<Map<number, { avg: number; n: number }>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ id: reviews.subjectId, avg: avg(reviews.rating), n: count() })
    .from(reviews)
    .where(inArray(reviews.subjectId, [...new Set(userIds)]))
    .groupBy(reviews.subjectId);
  return new Map(rows.map((r) => [r.id, { avg: Number(r.avg), n: Number(r.n) }]));
}

/**
 * Nombre de conversations avec des messages non lus pour cette personne.
 * Celle qui envoie un message marque la conversation comme lue pour elle au même instant (lastMessageAt = sa date de lecture) :
 * elle n'est donc jamais « non lue » pour l'expéditeur.
 */
export async function unreadConversations(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(conversations)
    .where(
      or(
        and(eq(conversations.buyerId, userId), or(isNull(conversations.buyerReadAt), lt(conversations.buyerReadAt, conversations.lastMessageAt))),
        and(eq(conversations.sellerId, userId), or(isNull(conversations.sellerReadAt), lt(conversations.sellerReadAt, conversations.lastMessageAt))),
      ),
    );
  return Number(row?.n ?? 0);
}

/** Nombre de messages déjà envoyés par chaque personne d'une conversation. */
export async function messageCountsBySender(conversationId: number): Promise<Map<number, number>> {
  const rows = await db.select({ id: messages.senderId, n: count() }).from(messages).where(eq(messages.conversationId, conversationId)).groupBy(messages.senderId);
  return new Map(rows.map((r) => [r.id, Number(r.n)]));
}
