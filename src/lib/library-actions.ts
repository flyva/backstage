"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { consoleMemories, fixtureModels, projectMembers, techInputs, techLights, wikiFiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { requireProject } from "@/lib/projects";
import { WIKI_URL_PREFIX } from "@/lib/wiki-files";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const refresh = () => revalidatePath("/bibliotheque", "layout");
const opt = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;

/** Créateur de l'entrée, ou admin / référent matériel. */
const canManage = (user: { id: number; role: string }, createdBy: number) => user.id === createdBy || user.role === "admin" || user.role === "materiel";

// ---------- Modèles d'appareils ----------

const fixtureSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  footprint: z.coerce.number().int().min(1, "Nombre de canaux : 1 minimum").max(512),
  watts: z.string().refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 100000), "Puissance invalide (en watts)"),
});

export async function saveFixture(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = fixtureSchema.safeParse({ name: fd.get("name"), footprint: fd.get("footprint") || 1, watts: String(fd.get("watts") ?? "").trim() });
  if (!p.success) return { error: p.error.issues[0].message };
  const values = { name: p.data.name, footprint: p.data.footprint, watts: p.data.watts === "" ? null : Number(p.data.watts), mode: opt(fd.get("mode"), 60), notes: opt(fd.get("notes"), 300) };
  const raw = fd.get("id");
  if (raw) {
    const [row] = await db.select().from(fixtureModels).where(eq(fixtureModels.id, id.parse(raw))).limit(1);
    if (!row || !canManage(user, row.createdBy)) return { error: "Modification non autorisée" };
    await db.update(fixtureModels).set(values).where(eq(fixtureModels.id, row.id));
  } else {
    await db.insert(fixtureModels).values({ ...values, createdBy: user.id });
  }
  refresh();
  return { ok: raw ? "Modèle enregistré" : "Modèle ajouté" };
}

export async function deleteFixture(fd: FormData) {
  const user = await requireUser();
  const [row] = await db.select().from(fixtureModels).where(eq(fixtureModels.id, id.parse(fd.get("id")))).limit(1);
  if (!row || !canManage(user, row.createdBy)) return;
  await db.delete(fixtureModels).where(eq(fixtureModels.id, row.id));
  refresh();
}

/** Depuis un projecteur d'une fiche : l'ajoute à la bibliothèque (sans doublon de nom et de mode). */
export async function lightToLibrary(lightId: number): Promise<FormState> {
  const user = await requireUser();
  const [light] = await db.select().from(techLights).where(eq(techLights.id, id.parse(lightId))).limit(1);
  if (!light) return { error: "Projecteur introuvable" };
  await requireProject(light.projectId);
  const same = await db.select({ id: fixtureModels.id, mode: fixtureModels.mode }).from(fixtureModels).where(eq(fixtureModels.name, light.label));
  if (same.some((s) => (s.mode ?? "") === (light.mode ?? ""))) return { ok: "Déjà dans la bibliothèque" };
  await db.insert(fixtureModels).values({ name: light.label, mode: light.mode, footprint: light.footprint, notes: light.notes, createdBy: user.id });
  refresh();
  return { ok: "Ajouté à la bibliothèque" };
}

// ---------- Copie de fiches entre projets ----------

/** Copie le patch lumière et / ou les entrées son d'un autre projet (dont on est membre) vers celui-ci. */
export async function copyTech(_: FormState, fd: FormData): Promise<FormState> {
  const targetId = id.parse(fd.get("projectId"));
  const { user } = await requireProject(targetId, "editor");
  const sourceId = Number(fd.get("sourceId"));
  if (!Number.isInteger(sourceId) || sourceId === targetId) return { error: "Choisis un autre projet" };
  const [member] = await db.select({ p: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, sourceId), eq(projectMembers.userId, user.id))).limit(1);
  if (!member) return { error: "Projet introuvable" };
  const wantLights = fd.get("lights") === "on";
  const wantInputs = fd.get("inputs") === "on";
  if (!wantLights && !wantInputs) return { error: "Coche ce que tu veux copier" };

  let nLights = 0;
  let nInputs = 0;
  await db.transaction(async (tx) => {
    if (wantLights) {
      const rows = await tx.select().from(techLights).where(eq(techLights.projectId, sourceId));
      if (rows.length) await tx.insert(techLights).values(rows.map((r) => ({ projectId: targetId, channel: r.channel, label: r.label, mode: r.mode, universe: r.universe, address: r.address, footprint: r.footprint, position: r.position, color: r.color, notes: r.notes })));
      nLights = rows.length;
    }
    if (wantInputs) {
      const rows = await tx.select().from(techInputs).where(eq(techInputs.projectId, sourceId));
      if (rows.length) await tx.insert(techInputs).values(rows.map((r) => ({ projectId: targetId, channel: r.channel, source: r.source, mic: r.mic, stand: r.stand, phantom: r.phantom, notes: r.notes })));
      nInputs = rows.length;
    }
  });
  revalidatePath(`/projets/${targetId}/fiches`, "layout");
  return { ok: `${nLights} projecteur(s) et ${nInputs} entrée(s) copiés` };
}

// ---------- Mémoires / scènes de console ----------

const memorySchema = z.object({
  title: z.string().trim().min(2, "Titre requis").max(150),
  notes: z.string().trim().max(10000),
});

const cleanTags = (raw: string) => {
  const set = new Set(raw.split(",").map((t) => t.trim().slice(0, 30)).filter(Boolean));
  return [...set].slice(0, 8).join(",") || null;
};

export async function saveMemory(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = memorySchema.safeParse({ title: fd.get("title"), notes: fd.get("notes") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };

  // La capture d'écran doit être un fichier envoyé sur Backstage (image) : on ne stocke que son nom.
  let image: string | null = null;
  const rawImage = String(fd.get("image") ?? "");
  if (rawImage.startsWith(WIKI_URL_PREFIX)) {
    const name = rawImage.slice(WIKI_URL_PREFIX.length);
    const [f] = await db.select().from(wikiFiles).where(eq(wikiFiles.file, name)).limit(1);
    if (f?.mime.startsWith("image/")) image = name;
  }

  const values = {
    title: p.data.title,
    console: opt(fd.get("console"), 80),
    number: opt(fd.get("number"), 30),
    category: opt(fd.get("category"), 60),
    notes: p.data.notes || null,
    tags: cleanTags(String(fd.get("tags") ?? "")),
    image,
    updatedAt: new Date(),
  };
  const raw = fd.get("id");
  if (raw) {
    const [row] = await db.select().from(consoleMemories).where(eq(consoleMemories.id, id.parse(raw))).limit(1);
    if (!row || !canManage(user, row.createdBy)) return { error: "Modification non autorisée" };
    await db.update(consoleMemories).set(values).where(eq(consoleMemories.id, row.id));
  } else {
    await db.insert(consoleMemories).values({ ...values, createdBy: user.id });
  }
  refresh();
  return { ok: raw ? "Mémoire enregistrée" : "Mémoire ajoutée" };
}

export async function deleteMemory(fd: FormData) {
  const user = await requireUser();
  const [row] = await db.select().from(consoleMemories).where(eq(consoleMemories.id, id.parse(fd.get("id")))).limit(1);
  if (!row || !canManage(user, row.createdBy)) return;
  await db.delete(consoleMemories).where(eq(consoleMemories.id, row.id));
  refresh();
}

