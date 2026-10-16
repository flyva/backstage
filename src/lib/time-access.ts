// Pointeuse : de quel compte on regarde les données (soi-même, ou une personne qui t'a désigné comme référent).
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";

export type TimeSubject = { userId: number; name: string; readonly: boolean; standardWorkMinutes: number; workDaysPerWeek: number };

export async function resolveTimeSubject(me: { id: number; name: string; standardWorkMinutes: number; workDaysPerWeek: number }, asParam: string | undefined): Promise<TimeSubject> {
  if (!asParam) return { userId: me.id, name: me.name, readonly: false, standardWorkMinutes: me.standardWorkMinutes, workDaysPerWeek: me.workDaysPerWeek };
  const target = Number(asParam);
  if (!Number.isInteger(target) || target <= 0) notFound();
  if (target === me.id) return { userId: me.id, name: me.name, readonly: false, standardWorkMinutes: me.standardWorkMinutes, workDaysPerWeek: me.workDaysPerWeek };
  const [row] = await db.select({ name: users.name, tutorUserId: users.tutorUserId, standardWorkMinutes: users.standardWorkMinutes, workDaysPerWeek: users.workDaysPerWeek }).from(users).where(eq(users.id, target)).limit(1);
  if (!row || row.tutorUserId !== me.id) notFound();
  return { userId: target, name: row.name, readonly: true, standardWorkMinutes: row.standardWorkMinutes, workDaysPerWeek: row.workDaysPerWeek };
}

/** Les personnes qui t'ont désigné comme référent (pour le sélecteur « voir aussi » sur les stats). */
export async function tutees(meId: number) {
  return db.select({ id: users.id, name: users.name }).from(users).where(eq(users.tutorUserId, meId)).orderBy(users.name);
}
