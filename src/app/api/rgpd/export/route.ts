import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseNotes, messages, networkContacts, personalNotes, loans, reviews, timeEntries, users, workLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";

// Export RGPD : un fichier JSON avec les données personnelles de la personne connectée (elle, et seulement elle).
export async function GET() {
  const user = await requireUser();

  const [profile, logs, pointeuse, sentMessages, givenReviews, receivedReviews, expenses, contacts, notesAbout, myLoans] = await Promise.all([
    db.select().from(users).where(eq(users.id, user.id)).limit(1),
    db.select({ day: workLogs.day, endDay: workLogs.endDay, place: workLogs.place, mission: workLogs.mission, skills: workLogs.skills, createdAt: workLogs.createdAt }).from(workLogs).where(eq(workLogs.userId, user.id)).orderBy(asc(workLogs.day)),
    db.select({ day: timeEntries.day, endDay: timeEntries.endDay, startMinutes: timeEntries.startMinutes, endMinutes: timeEntries.endMinutes, pauseMinutes: timeEntries.pauseMinutes, comment: timeEntries.comment }).from(timeEntries).where(eq(timeEntries.userId, user.id)).orderBy(asc(timeEntries.day)),
    db.select({ conversationId: messages.conversationId, body: messages.body, createdAt: messages.createdAt }).from(messages).where(eq(messages.senderId, user.id)).orderBy(asc(messages.createdAt)),
    db.select({ subjectId: reviews.subjectId, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }).from(reviews).where(eq(reviews.authorId, user.id)),
    db.select({ authorId: reviews.authorId, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }).from(reviews).where(eq(reviews.subjectId, user.id)),
    db.select({ date: expenseNotes.date, time: expenseNotes.time, placeName: expenseNotes.placeName, place: expenseNotes.place, priceCents: expenseNotes.priceCents, comment: expenseNotes.comment, createdAt: expenseNotes.createdAt }).from(expenseNotes).where(eq(expenseNotes.userId, user.id)).orderBy(asc(expenseNotes.date)),
    db.select({ name: networkContacts.name, jobTitle: networkContacts.jobTitle, company: networkContacts.company, email: networkContacts.email, phone: networkContacts.phone, linkUrl: networkContacts.linkUrl, notes: networkContacts.notes, createdAt: networkContacts.createdAt }).from(networkContacts).where(eq(networkContacts.userId, user.id)).orderBy(asc(networkContacts.createdAt)),
    db.select({ aboutUserId: personalNotes.aboutUserId, note: personalNotes.note, updatedAt: personalNotes.updatedAt }).from(personalNotes).where(eq(personalNotes.authorId, user.id)),
    db.select({ itemId: loans.itemId, quantity: loans.quantity, status: loans.status, startDate: loans.startDate, dueDate: loans.dueDate, note: loans.note, requestedAt: loans.requestedAt, returnedAt: loans.returnedAt }).from(loans).where(eq(loans.userId, user.id)).orderBy(asc(loans.requestedAt)),
  ]);

  const { passwordHash, googleSub, msOid, feedToken, ...safeProfile } = profile[0] ?? {};
  void passwordHash; void googleSub; void msOid; void feedToken; // jamais exportés : secrets d'authentification

  const data = {
    export_genere_le: new Date().toISOString(),
    profil: safeProfile,
    journal_de_bord: logs,
    pointeuse: pointeuse,
    notes_de_frais: expenses,
    messages_envoyes: sentMessages,
    avis_laisses: givenReviews,
    avis_recus: receivedReviews,
    carnet_de_reseau: contacts,
    notes_privees_sur_dautres_personnes: notesAbout,
    prets_de_materiel: myLoans,
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backstage-mes-donnees-${user.id}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
