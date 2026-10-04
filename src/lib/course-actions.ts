"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
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
