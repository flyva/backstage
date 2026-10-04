"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/actions";
import { and, eq, like } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { parseParisInput } from "@/lib/paris";
import { db } from "@/db";
import { courseSheets, courses } from "@/db/schema";
import { aiEnabled, generateRevisionSheet } from "@/lib/ai";
import { loadSubjects, sheetKey } from "@/lib/subjects";
import { requireUser } from "@/lib/auth";
import { MANUAL_PREFIX, syncCourses } from "@/lib/courses";
import { allow } from "@/lib/rate-limit";

/** Enregistre les notes d'un cours (vide = supprime la note), puis revient sur la page du cours. */
export async function saveCourseNote(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return { error: "Cours introuvable" };
  const note = String(fd.get("note") ?? "").trim().slice(0, 20000);
  const [row] = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.id, id), eq(courses.userId, user.id))).limit(1);
  if (!row) return { error: "Cours introuvable" };
  await db.update(courses).set({ note: note || null }).where(eq(courses.id, id));
  revalidatePath("/cours", "layout");
  redirect(`/cours/${id}`);
}

/** Synchronise tout de suite avec le lien iCalendar de l'école. */
export async function syncCoursesNow() {
  const user = await requireUser();
  if (user.icalUrl && allow(`course-sync:${user.id}`, 6, 10 * 60e3)) await syncCourses(user.id, user.icalUrl);
  revalidatePath("/cours");
  revalidatePath("/agenda");
}

/** Génère (ou régénère) la fiche de révision d'une matière à partir des notes de la personne. */
export async function generateSheet(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const key = String(fd.get("key") ?? "");
  if (!aiEnabled()) return { error: "L'IA n'est pas configurée sur ce serveur (MISTRAL_API_KEY manquante)." };
  if (!allow(`ai-sheet:${user.id}`, 8, 24 * 3600e3) || !allow("ai-sheet:all", 300, 24 * 3600e3)) return { error: "Limite du jour atteinte (8 fiches par jour). Réessaie demain." };
  const subject = (await loadSubjects(user.id)).find((s) => s.key === key);
  if (!subject || subject.noted.length === 0) return { error: "Cette matière n'a pas encore de notes." };
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
  try {
    const content = await generateRevisionSheet(subject.name, subject.noted.map((c) => ({ date: day.format(c.startsAt), text: c.note ?? "" })));
    await db.insert(courseSheets).values({ userId: user.id, subjectKey: sheetKey(key), content }).onDuplicateKeyUpdate({ set: { content, updatedAt: new Date() } });
  } catch (e) {
    console.error("[ai]", e instanceof Error ? e.message : e);
    return { error: e instanceof Error ? e.message : "Génération impossible" };
  }
  revalidatePath("/cours/fiches");
  return { ok: "Fiche générée" };
}

/** Ajoute un cours (ou une simple note) hors planning de l'école, puis ouvre sa page pour écrire. */
export async function createCourse(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const title = String(fd.get("title") ?? "").trim().slice(0, 255);
  if (!title) return { error: "Donne un titre au cours" };
  const day = String(fd.get("day") ?? "");
  const start = parseParisInput(`${day}T${String(fd.get("start") ?? "")}`);
  const end = parseParisInput(`${day}T${String(fd.get("end") ?? "")}`);
  if (!start || !end) return { error: "Indique la date et les horaires" };
  if (end <= start) return { error: "L'heure de fin doit être après le début" };
  if (!allow(`course-new:${user.id}`, 60, 24 * 3600e3)) return { error: "Trop d'ajouts aujourd'hui" };
  const [res] = await db.insert(courses).values({
    userId: user.id, uid: `${MANUAL_PREFIX}${randomBytes(8).toString("hex")}`, title, location: String(fd.get("location") ?? "").trim().slice(0, 255), startsAt: start, endsAt: end,
  });
  revalidatePath("/cours", "layout");
  revalidatePath("/agenda");
  redirect(`/cours/${res.insertId}`);
}

/** Supprime un cours ajouté à la main (ceux du planning de l'école sont gérés par la synchronisation). */
export async function deleteManualCourse(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, user.id), like(courses.uid, `${MANUAL_PREFIX}%`)));
  revalidatePath("/cours", "layout");
  revalidatePath("/agenda");
  redirect("/cours");
}
