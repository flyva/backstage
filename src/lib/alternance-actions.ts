"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workDays, workLogs, WORK_KINDS } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { KIND_CYCLE, addDays, isDay, isWeekend, parseHours } from "@/lib/alternance";
import type { FormState } from "@/lib/actions";

const refresh = () => {
  revalidatePath("/alternance", "layout");
  revalidatePath("/");
};

/** Clic sur un jour du calendrier : passe au type suivant (vide → école → entreprise → congé → férié → vide). */
export async function cycleDay(fd: FormData) {
  const user = await requireUser();
  const day = String(fd.get("day") ?? "");
  if (!isDay(day)) return;
  const [cur] = await db.select().from(workDays).where(and(eq(workDays.userId, user.id), eq(workDays.day, day))).limit(1);
  const next = KIND_CYCLE[(KIND_CYCLE.indexOf(cur?.kind ?? null) + 1) % KIND_CYCLE.length];
  if (next === null) await db.delete(workDays).where(and(eq(workDays.userId, user.id), eq(workDays.day, day)));
  else await db.insert(workDays).values({ userId: user.id, day, kind: next }).onDuplicateKeyUpdate({ set: { kind: next } });
  refresh();
}

async function fill(userId: number, days: string[], kind: (typeof WORK_KINDS)[number] | "vide") {
  for (let i = 0; i < days.length; i += 200) {
    const part = days.slice(i, i + 200);
    if (kind === "vide") {
      await db.delete(workDays).where(and(eq(workDays.userId, userId), inArray(workDays.day, part)));
    } else {
      await db.insert(workDays).values(part.map((day) => ({ userId, day, kind }))).onDuplicateKeyUpdate({ set: { kind } });
    }
  }
}

const rangeSchema = z.object({
  from: z.string().refine(isDay, "Date de début invalide"),
  to: z.string().refine(isDay, "Date de fin invalide"),
  kind: z.enum([...WORK_KINDS, "vide"]),
  weekdaysOnly: z.boolean(),
});

/** Applique un type à une période (jours ouvrés seulement, si demandé). */
export async function setRange(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = rangeSchema.safeParse({ from: fd.get("from"), to: fd.get("to"), kind: fd.get("kind"), weekdaysOnly: fd.get("weekdaysOnly") === "on" });
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.to < p.data.from) return { error: "La fin est avant le début" };
  const days: string[] = [];
  for (let d = p.data.from; d <= p.data.to && days.length < 400; d = addDays(d, 1)) {
    if (!p.data.weekdaysOnly || !isWeekend(d)) days.push(d);
  }
  if (days.length === 0) return { error: "Aucun jour dans la période" };
  if (days.length >= 400) return { error: "Période trop longue (400 jours max)" };
  await fill(user.id, days, p.data.kind);
  refresh();
  return { ok: `${days.length} jour(s) mis à jour` };
}

const rhythmSchema = z.object({
  start: z.string().refine(isDay, "Date de début invalide"),
  schoolWeeks: z.coerce.number().int().min(0).max(26),
  companyWeeks: z.coerce.number().int().min(0).max(52),
  cycles: z.coerce.number().int().min(1).max(30),
});

/** Rythme d'alternance : par exemple 1 semaine à l'école puis 3 en entreprise, répété N fois (lundi au vendredi). */
export async function applyRhythm(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = rhythmSchema.safeParse({ start: fd.get("start"), schoolWeeks: fd.get("schoolWeeks"), companyWeeks: fd.get("companyWeeks"), cycles: fd.get("cycles") });
  if (!p.success) return { error: p.error.issues[0].message };
  const { schoolWeeks, companyWeeks, cycles } = p.data;
  if (schoolWeeks + companyWeeks === 0) return { error: "Indique au moins une semaine" };
  // Le rythme commence le lundi de la semaine choisie.
  const monday = addDays(p.data.start, -((new Date(`${p.data.start}T12:00:00Z`).getUTCDay() + 6) % 7));
  const school: string[] = [];
  const company: string[] = [];
  let week = 0;
  for (let c = 0; c < cycles; c++) {
    for (let w = 0; w < schoolWeeks; w++, week++) for (let d = 0; d < 5; d++) school.push(addDays(monday, week * 7 + d));
    for (let w = 0; w < companyWeeks; w++, week++) for (let d = 0; d < 5; d++) company.push(addDays(monday, week * 7 + d));
  }
  if (school.length + company.length > 1500) return { error: "Période trop longue" };
  if (school.length) await fill(user.id, school, "ecole");
  if (company.length) await fill(user.id, company, "entreprise");
  refresh();
  return { ok: `${school.length + company.length} jour(s) planifiés` };
}

// ---------- Carnet de liaison ----------

const logSchema = z.object({
  day: z.string().refine(isDay, "Date invalide"),
  hours: z.string().refine((v) => parseHours(v) !== null, "Durée invalide (ex. 7h30 ou 7,5)"),
  place: z.enum(["entreprise", "ecole"]),
  mission: z.string().trim().min(3, "Décris la mission").max(5000),
  skills: z.string().trim().max(300),
});

const cleanSkills = (raw: string) => {
  const set = new Set(raw.split(",").map((t) => t.trim().slice(0, 40)).filter(Boolean));
  return [...set].slice(0, 8).join(",") || null;
};

export async function saveLog(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = logSchema.safeParse({ day: fd.get("day"), hours: fd.get("hours"), place: fd.get("place"), mission: fd.get("mission"), skills: fd.get("skills") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const values = { day: p.data.day, minutes: parseHours(p.data.hours)!, place: p.data.place, mission: p.data.mission, skills: cleanSkills(p.data.skills) };
  const raw = Number(fd.get("id") || 0);
  if (raw) await db.update(workLogs).set(values).where(and(eq(workLogs.id, raw), eq(workLogs.userId, user.id)));
  else await db.insert(workLogs).values({ ...values, userId: user.id });
  refresh();
  return { ok: raw ? "Entrée enregistrée" : "Entrée ajoutée" };
}

export async function deleteLog(fd: FormData) {
  const user = await requireUser();
  await db.delete(workLogs).where(and(eq(workLogs.id, Number(fd.get("id"))), eq(workLogs.userId, user.id)));
  refresh();
}

// ---------- Import du calendrier de l'école (PDF) ----------

const importSchema = z.array(z.object({ day: z.string().refine(isDay), kind: z.enum(["ecole", "entreprise", "ferie"]) })).min(1).max(1500);

/**
 * Applique le calendrier lu dans le PDF. Sur la période couverte, les jours école / entreprise / férié déjà saisis sont
 * remplacés par ceux du PDF ; les congés que tu as posés toi-même sont conservés.
 */
export async function importCalendar(payload: string): Promise<FormState> {
  const user = await requireUser();
  let raw: unknown;
  try { raw = JSON.parse(payload); } catch { return { error: "Données invalides" }; }
  const p = importSchema.safeParse(raw);
  if (!p.success) return { error: "Données invalides" };
  const days = p.data.map((d) => d.day).sort();
  const from = days[0];
  const to = days[days.length - 1];
  await db.transaction(async (tx) => {
    await tx.delete(workDays).where(and(eq(workDays.userId, user.id), gte(workDays.day, from), lte(workDays.day, to), inArray(workDays.kind, ["ecole", "entreprise", "ferie"])));
    for (let i = 0; i < p.data.length; i += 200) {
      await tx.insert(workDays).values(p.data.slice(i, i + 200).map((d) => ({ userId: user.id, day: d.day, kind: d.kind }))).onDuplicateKeyUpdate({ set: { kind: sql.raw("values(`kind`)") } });
    }
  });
  refresh();
  revalidatePath("/agenda");
  return { ok: `${p.data.length} jour(s) importés du ${from} au ${to}` };
}
