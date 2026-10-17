import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, reviews, timeEntries, users, workLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";

// Export RGPD : un fichier JSON avec les données personnelles de la personne connectée (elle, et seulement elle).
export async function GET() {
  const user = await requireUser();

  const [profile, logs, pointeuse, sentMessages, givenReviews, receivedReviews] = await Promise.all([
    db.select().from(users).where(eq(users.id, user.id)).limit(1),
    db.select({ day: workLogs.day, endDay: workLogs.endDay, place: workLogs.place, mission: workLogs.mission, skills: workLogs.skills, createdAt: workLogs.createdAt }).from(workLogs).where(eq(workLogs.userId, user.id)).orderBy(asc(workLogs.day)),
    db.select({ day: timeEntries.day, endDay: timeEntries.endDay, startMinutes: timeEntries.startMinutes, endMinutes: timeEntries.endMinutes, pauseMinutes: timeEntries.pauseMinutes, comment: timeEntries.comment }).from(timeEntries).where(eq(timeEntries.userId, user.id)).orderBy(asc(timeEntries.day)),
    db.select({ conversationId: messages.conversationId, body: messages.body, createdAt: messages.createdAt }).from(messages).where(eq(messages.senderId, user.id)).orderBy(asc(messages.createdAt)),
    db.select({ subjectId: reviews.subjectId, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }).from(reviews).where(eq(reviews.authorId, user.id)),
    db.select({ authorId: reviews.authorId, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }).from(reviews).where(eq(reviews.subjectId, user.id)),
  ]);

  const { passwordHash, googleSub, msOid, feedToken, ...safeProfile } = profile[0] ?? {};
  void passwordHash; void googleSub; void msOid; void feedToken; // jamais exportés : secrets d'authentification

  const data = {
    export_genere_le: new Date().toISOString(),
    profil: safeProfile,
    carnet_de_competences: logs,
    pointeuse: pointeuse,
    messages_envoyes: sentMessages,
    avis_laisses: givenReviews,
    avis_recus: receivedReviews,
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backstage-mes-donnees-${user.id}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
