import "server-only";
import { and, avg, count, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversations, messageAttachments, messages, reviews } from "@/db/schema";
import { toLive, type LiveMessage } from "@/lib/message-bus";

type Conv = { id: number; kind: "listing" | "dm" | "group"; buyerId: number; sellerId: number };

/** Est-elle (encore) dans cette conversation ? Pour un groupe, vérifie l'adhésion (et qu'elle ne l'a pas quitté). */
export async function isParticipant(conv: Conv, userId: number): Promise<boolean> {
  if (conv.kind !== "group") return conv.buyerId === userId || conv.sellerId === userId;
  const [row] = await db.select({ id: conversationMembers.id }).from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conv.id), eq(conversationMembers.userId, userId), isNull(conversationMembers.leftAt))).limit(1);
  return !!row;
}

/** Membres actifs (n'ont pas quitté) d'un groupe, hors `exceptUserId` si fourni. */
export async function activeGroupMemberIds(conversationId: number, exceptUserId?: number): Promise<number[]> {
  const rows = await db.select({ userId: conversationMembers.userId }).from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), isNull(conversationMembers.leftAt), ...(exceptUserId ? [ne(conversationMembers.userId, exceptUserId)] : [])));
  return rows.map((r) => r.userId);
}

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
  const [[row], [groupRow]] = await Promise.all([
    db.select({ n: count() }).from(conversations).where(
      and(
        ne(conversations.kind, "group"),
        or(
          and(eq(conversations.buyerId, userId), or(isNull(conversations.buyerReadAt), lt(conversations.buyerReadAt, conversations.lastMessageAt))),
          and(eq(conversations.sellerId, userId), or(isNull(conversations.sellerReadAt), lt(conversations.sellerReadAt, conversations.lastMessageAt))),
        ),
      ),
    ),
    db.select({ n: count() }).from(conversationMembers).innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId)).where(
      and(
        eq(conversationMembers.userId, userId),
        isNull(conversationMembers.leftAt),
        or(isNull(conversationMembers.readAt), lt(conversationMembers.readAt, conversations.lastMessageAt)),
      ),
    ),
  ]);
  return Number(row?.n ?? 0) + Number(groupRow?.n ?? 0);
}

/** Nombre de messages déjà envoyés par chaque personne d'une conversation. */
export async function messageCountsBySender(conversationId: number): Promise<Map<number, number>> {
  const rows = await db.select({ id: messages.senderId, n: count() }).from(messages).where(eq(messages.conversationId, conversationId)).groupBy(messages.senderId);
  return new Map(rows.map((r) => [r.id, Number(r.n)]));
}

/** Associe à chaque message ses pièces jointes et l'aperçu du message cité (réponse), pour l'affichage et le flux en direct. */
export async function hydrateMessages(conversationId: number, rows: { id: number; senderId: number; body: string; replyToId: number | null; createdAt: Date }[]): Promise<LiveMessage[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const replyIds = [...new Set(rows.map((r) => r.replyToId).filter((id): id is number => id !== null))];
  const [files, replies] = await Promise.all([
    db.select().from(messageAttachments).where(inArray(messageAttachments.messageId, ids)),
    replyIds.length ? db.select({ id: messages.id, senderId: messages.senderId, body: messages.body }).from(messages).where(and(inArray(messages.id, replyIds), eq(messages.conversationId, conversationId))) : Promise.resolve([]),
  ]);
  const filesByMessage = new Map<number, typeof files>();
  for (const f of files) filesByMessage.set(f.messageId, [...(filesByMessage.get(f.messageId) ?? []), f]);
  const replyById = new Map(replies.map((r) => [r.id, r]));
  return rows.map((m) =>
    toLive(
      m,
      m.replyToId ? (replyById.get(m.replyToId) ?? null) : null,
      (filesByMessage.get(m.id) ?? []).map((f) => ({ id: f.id, name: f.originalName, mime: f.mime, size: f.size, url: `/api/messages/${conversationId}/files/${f.id}` })),
    ),
  );
}
