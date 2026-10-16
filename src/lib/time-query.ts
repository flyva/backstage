// Pointeuse : va chercher les lignes saisies et le planning sur une période, et résout chaque jour (lecture seule, pas d'action).
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { timeEntries, workDays } from "@/db/schema";
import { addDays } from "@/lib/alternance";
import { daySummary, type DaySummary } from "@/lib/pointeuse";

export async function fetchDaySummaries(userId: number, from: string, to: string, today: string, workDaysPerWeek: number): Promise<DaySummary[]> {
  const [wd, te] = await Promise.all([
    db.select().from(workDays).where(and(eq(workDays.userId, userId), gte(workDays.day, from), lte(workDays.day, to))),
    db.select().from(timeEntries).where(and(eq(timeEntries.userId, userId), gte(timeEntries.day, from), lte(timeEntries.day, to))).orderBy(asc(timeEntries.startMinutes)),
  ]);
  const kindOf = new Map(wd.map((r) => [r.day, r.kind]));
  const entriesByDay = new Map<string, typeof te>();
  for (const e of te) entriesByDay.set(e.day, [...(entriesByDay.get(e.day) ?? []), e]);
  const out: DaySummary[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(daySummary(d, today, kindOf.get(d), entriesByDay.get(d) ?? [], workDaysPerWeek));
  return out;
}
