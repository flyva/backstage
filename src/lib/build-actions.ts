"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { buildSlotAssignees, buildSlots, powerCircuits, powerItems, projectMembers, techLights, fixtureModels } from "@/db/schema";
import { requireProject } from "@/lib/projects";
import { isDay } from "@/lib/alternance";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const touchPlan = (pid: number) => revalidatePath(`/projets/${pid}/planning`);
const touchPower = (pid: number) => revalidatePath(`/projets/${pid}/charge`);

// ---------- Planning de montage ----------

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)");
const slotSchema = z.object({
  day: z.string().refine(isDay, "Date invalide"),
  startTime: time,
  endTime: time,
  title: z.string().trim().min(2, "Titre requis").max(200),
  notes: z.string().trim().max(500),
});

export async function saveSlot(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const p = slotSchema.safeParse({ day: fd.get("day"), startTime: fd.get("startTime"), endTime: fd.get("endTime"), title: fd.get("title"), notes: fd.get("notes") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.endTime <= p.data.startTime) return { error: "La fin doit être après le début" };

  // Les personnes assignées doivent faire partie du projet.
  const wanted = [...new Set(fd.getAll("assigneeIds").map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (wanted.length > 0) {
    const ok = await db.select({ u: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, pid), inArray(projectMembers.userId, wanted)));
    if (ok.length !== wanted.length) return { error: "Une personne assignée ne fait pas partie du projet" };
  }

  const values = { ...p.data, notes: p.data.notes || null };
  const raw = Number(fd.get("id") || 0);
  let slotId = raw;
  if (raw) {
    const [ex] = await db.select({ i: buildSlots.id }).from(buildSlots).where(and(eq(buildSlots.id, raw), eq(buildSlots.projectId, pid))).limit(1);
    if (!ex) return { error: "Créneau introuvable" };
    await db.update(buildSlots).set(values).where(eq(buildSlots.id, raw));
  } else {
    const [r] = await db.insert(buildSlots).values({ ...values, projectId: pid });
    slotId = r.insertId;
  }
  await db.delete(buildSlotAssignees).where(eq(buildSlotAssignees.slotId, slotId));
  if (wanted.length > 0) await db.insert(buildSlotAssignees).values(wanted.map((userId) => ({ slotId, userId })));
  touchPlan(pid);
  return { ok: raw ? "Créneau enregistré" : "Créneau ajouté" };
}

export async function deleteSlot(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  await db.delete(buildSlots).where(and(eq(buildSlots.id, id.parse(fd.get("id"))), eq(buildSlots.projectId, pid)));
  touchPlan(pid);
}

// ---------- Charge électrique ----------

const circuitSchema = z.object({
  name: z.string().trim().min(1, "Nom de la ligne requis").max(60),
  breakerAmps: z.coerce.number().int().min(2, "Calibre : 2 A minimum").max(125, "Calibre : 125 A maximum"),
  mode: z.enum(["mono", "tetra"]),
});

export async function saveCircuit(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const p = circuitSchema.safeParse({ name: fd.get("name"), breakerAmps: fd.get("breakerAmps"), mode: fd.get("mode") });
  if (!p.success) return { error: p.error.issues[0].message };
  const raw = Number(fd.get("id") || 0);
  if (raw) {
    await db.update(powerCircuits).set(p.data).where(and(eq(powerCircuits.id, raw), eq(powerCircuits.projectId, pid)));
  } else {
    const rows = await db.select({ i: powerCircuits.id }).from(powerCircuits).where(eq(powerCircuits.projectId, pid));
    await db.insert(powerCircuits).values({ ...p.data, projectId: pid, position: rows.length });
  }
  touchPower(pid);
  return { ok: raw ? "Ligne enregistrée" : "Ligne ajoutée" };
}

export async function deleteCircuit(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  await db.delete(powerCircuits).where(and(eq(powerCircuits.id, id.parse(fd.get("id"))), eq(powerCircuits.projectId, pid)));
  touchPower(pid); // les appareils du circuit restent, sans circuit (clé « set null »)
}

const itemSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  watts: z.coerce.number().int().min(0, "Puissance : 0 minimum").max(100000, "Puissance trop grande"),
  qty: z.coerce.number().int().min(1, "Quantité : 1 minimum").max(999),
});

export async function saveItem(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const p = itemSchema.safeParse({ name: fd.get("name"), watts: fd.get("watts"), qty: fd.get("qty") || 1 });
  if (!p.success) return { error: p.error.issues[0].message };

  // Le circuit choisi doit appartenir à ce projet.
  let circuitId: number | null = null;
  const rawCircuit = Number(fd.get("circuitId") || 0);
  if (rawCircuit) {
    const [c] = await db.select({ i: powerCircuits.id }).from(powerCircuits).where(and(eq(powerCircuits.id, rawCircuit), eq(powerCircuits.projectId, pid))).limit(1);
    if (!c) return { error: "Ligne introuvable" };
    circuitId = c.i;
  }
  const raw = Number(fd.get("id") || 0);
  if (raw) await db.update(powerItems).set({ ...p.data, circuitId }).where(and(eq(powerItems.id, raw), eq(powerItems.projectId, pid)));
  else await db.insert(powerItems).values({ ...p.data, circuitId, projectId: pid });
  touchPower(pid);
  return { ok: raw ? "Appareil enregistré" : "Appareil ajouté" };
}

export async function deleteItem(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  await db.delete(powerItems).where(and(eq(powerItems.id, id.parse(fd.get("id"))), eq(powerItems.projectId, pid)));
  touchPower(pid);
}

/** Importe les projecteurs de la fiche lumière (regroupés par nom) ; la puissance vient de la bibliothèque si le nom y est. */
export async function importLightsToPower(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const lights = await db.select().from(techLights).where(eq(techLights.projectId, pid));
  if (lights.length === 0) return;
  const models = await db.select().from(fixtureModels);
  const byName = new Map(models.map((m) => [m.name.toLowerCase(), m.watts]));
  const existing = new Set((await db.select({ n: powerItems.name }).from(powerItems).where(eq(powerItems.projectId, pid))).map((r) => r.n.toLowerCase()));
  const counts = new Map<string, number>();
  for (const l of lights) counts.set(l.label, (counts.get(l.label) ?? 0) + 1);
  const rows = [...counts]
    .filter(([name]) => !existing.has(name.toLowerCase()))
    .map(([name, qty]) => ({ projectId: pid, name, qty, watts: byName.get(name.toLowerCase()) ?? 0 }));
  if (rows.length) await db.insert(powerItems).values(rows);
  touchPower(pid);
}

