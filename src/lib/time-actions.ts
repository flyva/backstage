"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { timeEntries, users, workDays } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addDays, isDay, parseTime } from "@/lib/alternance";
import { FIXED_KINDS } from "@/lib/pointeuse";
import type { FormState } from "@/lib/actions";

const refresh = () => {
  revalidatePath("/alternance/pointeuse");
  revalidatePath("/alternance/stats");
};

// ---------- Lignes d'heures ----------

const entrySchema = z.object({
  day: z.string().refine(isDay, "Date invalide"),
  endDay: z.string().refine(isDay, "Date de fin invalide"),
  start: z.string().refine((v) => parseTime(v) !== null, "Heure de début invalide"),
  end: z.string().refine((v) => parseTime(v) !== null, "Heure de fin invalide"),
  pause: z.coerce.number().int().min(0, "Pause : 0 minimum").max(600, "Pause trop longue"),
  comment: z.string().trim().max(300),
});

export async function saveTimeEntry(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const today = todayParis();
  const p = entrySchema.safeParse({
    day: fd.get("day"), endDay: fd.get("endDay") || fd.get("day"), start: fd.get("start"), end: fd.get("end"), pause: fd.get("pause") || 0, comment: fd.get("comment") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.day > today) return { error: "Impossible d'ajouter une ligne dans le futur" };
  if (p.data.endDay > today) return { error: "La fin ne peut pas être dans le futur" };
  if (p.data.endDay < p.data.day) return { error: "La fin ne peut pas être avant le début" };
  if (p.data.endDay > addDays(p.data.day, 1)) return { error: "Une ligne ne peut pas passer plus d'une nuit (24 h max)" };
  const startMinutes = parseTime(p.data.start)!;
  const endMinutes = parseTime(p.data.end)!;
  const crossesMidnight = p.data.endDay > p.data.day;
  if (!crossesMidnight && endMinutes <= startMinutes) return { error: "L'heure de fin doit être après le début (ou choisis le lendemain si ça passe minuit)" };
  const span = crossesMidnight ? 1440 - startMinutes + endMinutes : endMinutes - startMinutes;
  if (p.data.pause > span) return { error: "La pause ne peut pas dépasser la durée totale" };

  // Un jour école / congé / maladie est déjà compté automatiquement (7 h fixes) : pas de ligne à ajouter dessus.
  const [wd] = await db.select({ kind: workDays.kind }).from(workDays).where(and(eq(workDays.userId, user.id), eq(workDays.day, p.data.day))).limit(1);
  if (wd && (FIXED_KINDS as readonly string[]).includes(wd.kind)) {
    return { error: "Ce jour est marqué école, congé ou maladie : il est déjà compté, retire d'abord ce marquage sur le planning ou la pointeuse si tu veux saisir des heures." };
  }

  const values = { day: p.data.day, endDay: p.data.endDay, startMinutes, endMinutes, pauseMinutes: p.data.pause, comment: p.data.comment || null };
  const raw = Number(fd.get("id") || 0);
  if (raw) await db.update(timeEntries).set(values).where(and(eq(timeEntries.id, raw), eq(timeEntries.userId, user.id)));
  else await db.insert(timeEntries).values({ ...values, userId: user.id });
  refresh();
  return { ok: raw ? "Ligne enregistrée" : "Ligne ajoutée" };
}

export async function deleteTimeEntry(fd: FormData) {
  const user = await requireUser();
  await db.delete(timeEntries).where(and(eq(timeEntries.id, Number(fd.get("id"))), eq(timeEntries.userId, user.id)));
  refresh();
}

// ---------- Jours congé / maladie (depuis la pointeuse) ----------

const statusSchema = z.object({ day: z.string().refine(isDay, "Date invalide"), kind: z.enum(["conge", "maladie", "vide"]) });

/** Marque (ou retire) un jour congé/maladie directement depuis la pointeuse. Ne touche jamais école/entreprise/férié. */
export async function setDayStatus(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = statusSchema.safeParse({ day: fd.get("day"), kind: fd.get("kind") });
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.kind === "vide") {
    await db.delete(workDays).where(and(eq(workDays.userId, user.id), eq(workDays.day, p.data.day)));
  } else {
    await db.insert(workDays).values({ userId: user.id, day: p.data.day, kind: p.data.kind }).onDuplicateKeyUpdate({ set: { kind: p.data.kind } });
  }
  refresh();
  revalidatePath("/alternance");
  return { ok: "Jour mis à jour" };
}

// ---------- Réglages pointeuse (durée standard, référent) ----------

const settingsSchema = z.object({
  standardHours: z.coerce.number().min(1, "Durée : 1 h minimum").max(16, "Durée : 16 h maximum"),
  tutorUserId: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
});

export async function saveTimeSettings(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = settingsSchema.safeParse({ standardHours: fd.get("standardHours"), tutorUserId: fd.get("tutorUserId") });
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.tutorUserId === user.id) return { error: "Tu ne peux pas être ton propre référent" };
  if (p.data.tutorUserId) {
    const [t] = await db.select({ i: users.id }).from(users).where(eq(users.id, p.data.tutorUserId)).limit(1);
    if (!t) return { error: "Référent introuvable" };
  }
  await db.update(users).set({ standardWorkMinutes: Math.round(p.data.standardHours * 60), tutorUserId: p.data.tutorUserId }).where(eq(users.id, user.id));
  revalidatePath("/parametres");
  refresh();
  return { ok: "Réglages enregistrés" };
}
