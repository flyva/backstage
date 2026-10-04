"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/actions";
import { and, eq, like } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { parseParisInput } from "@/lib/paris";
import { db } from "@/db";
import { courses } from "@/db/schema";
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
