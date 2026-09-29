"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projectFiles, techInputs, techLights } from "@/db/schema";
import { requireProject } from "@/lib/projects";
import { parseCsv } from "@/lib/csv";
import { DMX_MAX, mapLightCsv } from "@/lib/tech";
import { removeProjectFile } from "@/lib/project-files";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const touch = (projectId: number) => revalidatePath(`/projets/${projectId}/fiches`, "layout");
const opt = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;
const optInt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
};

// ---------- Patch lumière ----------

const lightSchema = z.object({
  label: z.string().trim().min(1, "Nom requis").max(120),
  channel: z.number().int().min(0).max(99999).nullable(),
  universe: z.number().int().min(1, "Univers : 1 minimum").max(999),
  address: z.number().int().min(1, `Adresse : 1 à ${DMX_MAX}`).max(DMX_MAX, `Adresse : 1 à ${DMX_MAX}`).nullable(),
  footprint: z.number().int().min(1, "Nombre de canaux : 1 minimum").max(DMX_MAX),
});

function readLight(fd: FormData) {
  const channel = optInt(fd.get("channel"));
  const address = optInt(fd.get("address"));
  const universe = optInt(fd.get("universe")) ?? 1;
  const footprint = optInt(fd.get("footprint")) ?? 1;
  if ([channel, address, universe, footprint].some((n) => Number.isNaN(n))) return { error: "Les numéros doivent être des nombres entiers" } as const;
  const p = lightSchema.safeParse({ label: fd.get("label"), channel, universe, address, footprint });
  if (!p.success) return { error: p.error.issues[0].message } as const;
  return {
    value: { ...p.data, mode: opt(fd.get("mode"), 60), position: opt(fd.get("position"), 100), color: opt(fd.get("color"), 60), notes: opt(fd.get("notes"), 300) },
  } as const;
}

export async function addLight(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const l = readLight(fd);
  if ("error" in l) return { error: l.error };
  await db.insert(techLights).values({ projectId: pid, ...l.value });
  touch(pid);
  return { ok: "Projecteur ajouté" };
}

async function lightProject(lightId: number) {
  const [r] = await db.select({ projectId: techLights.projectId }).from(techLights).where(eq(techLights.id, lightId)).limit(1);
  return r?.projectId ?? null;
}

export async function updateLight(_: FormState, fd: FormData): Promise<FormState> {
  const lid = id.parse(fd.get("lightId"));
  const pid = await lightProject(lid);
  if (!pid) return { error: "Projecteur introuvable" };
  await requireProject(pid, "editor");
  const l = readLight(fd);
  if ("error" in l) return { error: l.error };
  await db.update(techLights).set(l.value).where(eq(techLights.id, lid));
  touch(pid);
  return { ok: "Enregistré" };
}

export async function deleteLight(fd: FormData) {
  const lid = id.parse(fd.get("lightId"));
  const pid = await lightProject(lid);
  if (!pid) return;
  await requireProject(pid, "editor");
  await db.delete(techLights).where(eq(techLights.id, lid));
  touch(pid);
}

export async function importLights(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const csv = String(fd.get("csv") ?? "");
  if (csv.length > 2_000_000) return { error: "Fichier trop volumineux" };
  // Le serveur refait l'analyse : on ne fait pas confiance à un aperçu calculé côté navigateur.
  const res = mapLightCsv(parseCsv(csv));
  if (res.lights.length === 0) return { error: res.warnings[0] ?? "Aucune ligne à importer" };

  const replace = fd.get("mode") === "replace";
  await db.transaction(async (tx) => {
    if (replace) await tx.delete(techLights).where(eq(techLights.projectId, pid));
    await tx.insert(techLights).values(res.lights.map((l) => ({ projectId: pid, ...l })));
  });
  touch(pid);
  return { ok: `${res.lights.length} projecteur(s) importé(s)${replace ? " (patch remplacé)" : ""}${res.skipped ? `, ${res.skipped} ligne(s) ignorée(s)` : ""}.` };
}

// ---------- Liste d'entrées son ----------

const inputSchema = z.object({
  channel: z.number().int().min(1, "Canal : 1 minimum").max(999),
  source: z.string().trim().min(1, "Source requise").max(100),
});

function readInput(fd: FormData) {
  const channel = optInt(fd.get("channel"));
  if (channel === null || Number.isNaN(channel)) return { error: "Le canal doit être un nombre entier" } as const;
  const p = inputSchema.safeParse({ channel, source: fd.get("source") });
  if (!p.success) return { error: p.error.issues[0].message } as const;
  return { value: { ...p.data, mic: opt(fd.get("mic"), 100), stand: opt(fd.get("stand"), 60), phantom: fd.get("phantom") === "on", notes: opt(fd.get("notes"), 300) } } as const;
}

export async function addInput(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const i = readInput(fd);
  if ("error" in i) return { error: i.error };
  await db.insert(techInputs).values({ projectId: pid, ...i.value });
  touch(pid);
  return { ok: "Entrée ajoutée" };
}

async function inputProject(inputId: number) {
  const [r] = await db.select({ projectId: techInputs.projectId }).from(techInputs).where(eq(techInputs.id, inputId)).limit(1);
  return r?.projectId ?? null;
}

export async function updateInput(_: FormState, fd: FormData): Promise<FormState> {
  const iid = id.parse(fd.get("inputId"));
  const pid = await inputProject(iid);
  if (!pid) return { error: "Entrée introuvable" };
  await requireProject(pid, "editor");
  const i = readInput(fd);
  if ("error" in i) return { error: i.error };
  await db.update(techInputs).set(i.value).where(eq(techInputs.id, iid));
  touch(pid);
  return { ok: "Enregistré" };
}

export async function deleteInput(fd: FormData) {
  const iid = id.parse(fd.get("inputId"));
  const pid = await inputProject(iid);
  if (!pid) return;
  await requireProject(pid, "editor");
  await db.delete(techInputs).where(eq(techInputs.id, iid));
  touch(pid);
}

// ---------- Fichiers (fiches papier, plans, PDF) ----------

export async function deleteProjectFile(fd: FormData) {
  const fid = id.parse(fd.get("fileId"));
  const [f] = await db.select().from(projectFiles).where(eq(projectFiles.id, fid)).limit(1);
  if (!f) return;
  await requireProject(f.projectId, "editor");
  await db.delete(projectFiles).where(and(eq(projectFiles.id, fid), eq(projectFiles.projectId, f.projectId)));
  await removeProjectFile(f.file);
  touch(f.projectId);
}
