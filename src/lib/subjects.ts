import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";

// Une « matière » = le titre du cours dans le planning (sans tenir compte des majuscules, accents et espaces en trop).
export const subjectKey = (title: string) =>
  title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

export type SubjectCourse = typeof courses.$inferSelect;
export type Subject = { key: string; name: string; courses: SubjectCourse[]; noted: SubjectCourse[] };

/** Cours de la personne regroupés par matière, du plus ancien au plus récent ; le nom affiché est le titre le plus fréquent. */
export async function loadSubjects(userId: number): Promise<Subject[]> {
  const rows = await db.select().from(courses).where(eq(courses.userId, userId)).orderBy(asc(courses.startsAt));
  const groups = Map.groupBy(rows, (c) => subjectKey(c.title));
  return [...groups]
    .map(([key, list]) => {
      const counts = new Map<string, number>();
      for (const c of list) counts.set(c.title, (counts.get(c.title) ?? 0) + 1);
      const name = [...counts].sort((a, b) => b[1] - a[1])[0][0];
      return { key, name, courses: list, noted: list.filter((c) => c.note?.trim()) };
    })
    .sort((a, b) => b.noted.length - a.noted.length || a.name.localeCompare(b.name, "fr"));
}

