"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseSheets, courses } from "@/db/schema";
import { aiEnabled, generateRevisionSheet } from "@/lib/ai";
import { loadSubjects, sheetKey } from "@/lib/subjects";
import { requireUser } from "@/lib/auth";
import { syncCourses } from "@/lib/courses";
import { allow } from "@/lib/rate-limit";

/** Enregistre les notes personnelles d'un cours (vide = supprime la note). */
export async function saveCourseNote(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  const note = String(fd.get("note") ?? "").trim().slice(0, 10000);
  await db.update(courses).set({ note: note || null }).where(and(eq(courses.id, id), eq(courses.userId, user.id)));
  revalidatePath("/cours");
}

/** Synchronise tout de suite avec le lien iCalendar de l'école. */
export async function syncCoursesNow() {
  const user = await requireUser();
  if (user.icalUrl && allow(`course-sync:${user.id}`, 6, 10 * 60e3)) await syncCourses(user.id, user.icalUrl);
  revalidatePath("/cours");
  revalidatePath("/agenda");
}

/** Génère (ou régénère) la fiche de révision d'une matière à partir des notes de la personne. */
export async function generateSheet(fd: FormData) {
  const user = await requireUser();
  const key = String(fd.get("key") ?? "");
  if (!aiEnabled() || !key) return;
  if (!allow(`ai-sheet:${user.id}`, 8, 24 * 3600e3) || !allow("ai-sheet:all", 300, 24 * 3600e3)) return;
  const subject = (await loadSubjects(user.id)).find((s) => s.key === key);
  if (!subject || subject.noted.length === 0) return;
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
  try {
    const content = await generateRevisionSheet(subject.name, subject.noted.map((c) => ({ date: day.format(c.startsAt), text: c.note ?? "" })));
    const k = sheetKey(key);
    await db.insert(courseSheets).values({ userId: user.id, subjectKey: k, content }).onDuplicateKeyUpdate({ set: { content, updatedAt: new Date() } });
  } catch (e) {
    console.error("[ai]", e instanceof Error ? e.message : e);
  }
  revalidatePath("/cours/fiches");
}
