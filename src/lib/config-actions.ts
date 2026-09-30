"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { checklistTemplates, faqItems, usefulLinks, wikiPages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { templateItems } from "@/lib/checklist-templates";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const dir = (fd: FormData) => (fd.get("dir") === "up" ? -1 : 1);
const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/faq");
  revalidatePath("/liens");
  revalidatePath("/wiki");
};

/** Échange la place d'un élément avec son voisin, puis renumérote la liste (positions toutes distinctes). */
async function swap(ids: number[], target: number, d: -1 | 1, write: (id: number, position: number) => Promise<unknown>) {
  const i = ids.indexOf(target);
  const j = i + d;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (const [position, rowId] of ids.entries()) await write(rowId, position);
}

// ---------- Modèles de checklists ----------

const templateSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(150),
  items: z.string().max(10000),
});

export async function saveTemplate(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = templateSchema.safeParse({ title: fd.get("title"), items: fd.get("items") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const items = templateItems(p.data.items);
  if (items.length === 0) return { error: "Ajoute au moins un élément (un par ligne)" };
  if (items.some((l) => l.length > 255)) return { error: "Un élément est trop long (255 caractères max)" };
  const raw = fd.get("id");
  if (raw) {
    await db.update(checklistTemplates).set({ title: p.data.title, items: items.join("\n") }).where(eq(checklistTemplates.id, id.parse(raw)));
  } else {
    const rows = await db.select({ id: checklistTemplates.id }).from(checklistTemplates);
    await db.insert(checklistTemplates).values({ title: p.data.title, items: items.join("\n"), position: rows.length });
  }
  refresh();
  return { ok: raw ? "Modèle enregistré" : "Modèle ajouté" };
}

export async function deleteTemplate(fd: FormData) {
  await requireAdmin();
  await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id.parse(fd.get("id"))));
  refresh();
}

export async function moveTemplate(fd: FormData) {
  await requireAdmin();
  const target = id.parse(fd.get("id"));
  const list = await db.select({ id: checklistTemplates.id }).from(checklistTemplates).orderBy(asc(checklistTemplates.position), asc(checklistTemplates.id));
  await swap(list.map((r) => r.id), target, dir(fd), (rowId, position) => db.update(checklistTemplates).set({ position }).where(eq(checklistTemplates.id, rowId)));
  refresh();
}

// ---------- FAQ ----------

const faqSchema = z.object({
  category: z.string().trim().min(1).max(80),
  question: z.string().trim().min(3, "Question trop courte").max(255),
  answer: z.string().trim().min(1, "Réponse requise").max(20000),
});

export async function saveFaq(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = faqSchema.safeParse({ category: fd.get("category"), question: fd.get("question"), answer: fd.get("answer") });
  if (!p.success) return { error: p.error.issues[0].message };
  const raw = fd.get("id");
  if (raw) {
    await db.update(faqItems).set(p.data).where(eq(faqItems.id, id.parse(raw)));
  } else {
    const same = await db.select({ id: faqItems.id }).from(faqItems).where(eq(faqItems.category, p.data.category));
    await db.insert(faqItems).values({ ...p.data, position: same.length });
  }
  refresh();
  return { ok: raw ? "Question enregistrée" : "Question ajoutée" };
}

export async function moveFaq(fd: FormData) {
  await requireAdmin();
  const target = id.parse(fd.get("id"));
  const [row] = await db.select().from(faqItems).where(eq(faqItems.id, target)).limit(1);
  if (!row) return;
  const list = await db.select({ id: faqItems.id }).from(faqItems).where(eq(faqItems.category, row.category)).orderBy(asc(faqItems.position), asc(faqItems.id));
  await swap(list.map((r) => r.id), target, dir(fd), (rowId, position) => db.update(faqItems).set({ position }).where(eq(faqItems.id, rowId)));
  refresh();
}

// ---------- Liens utiles ----------

const linkSchema = z.object({
  category: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1, "Titre requis").max(120),
  url: z.string().trim().max(1000).refine((v) => /^https?:\/\/[^\s]+$/i.test(v), "Adresse invalide (https://…)"),
  description: z.string().trim().max(255),
});

export async function saveLink(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = linkSchema.safeParse({ category: fd.get("category"), label: fd.get("label"), url: fd.get("url"), description: fd.get("description") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const values = { ...p.data, description: p.data.description || null };
  const raw = fd.get("id");
  if (raw) {
    await db.update(usefulLinks).set(values).where(eq(usefulLinks.id, id.parse(raw)));
  } else {
    const same = await db.select({ id: usefulLinks.id }).from(usefulLinks).where(eq(usefulLinks.category, values.category));
    await db.insert(usefulLinks).values({ ...values, position: same.length });
  }
  refresh();
  return { ok: raw ? "Lien enregistré" : "Lien ajouté" };
}

export async function moveLink(fd: FormData) {
  await requireAdmin();
  const target = id.parse(fd.get("id"));
  const [row] = await db.select().from(usefulLinks).where(eq(usefulLinks.id, target)).limit(1);
  if (!row) return;
  const list = await db.select({ id: usefulLinks.id }).from(usefulLinks).where(eq(usefulLinks.category, row.category)).orderBy(asc(usefulLinks.position), asc(usefulLinks.id));
  await swap(list.map((r) => r.id), target, dir(fd), (rowId, position) => db.update(usefulLinks).set({ position }).where(eq(usefulLinks.id, rowId)));
  refresh();
}

// ---------- Wiki : catégories ----------

/** Renomme une catégorie du wiki (ou la fusionne avec une autre en lui donnant le même nom). */
export async function renameWikiCategory(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const from = z.string().trim().min(1).max(80).safeParse(fd.get("from"));
  const to = z.string().trim().min(1, "Nom requis").max(80).safeParse(fd.get("to"));
  if (!from.success || !to.success) return { error: "Nom de catégorie invalide" };
  if (from.data === to.data) return { ok: "Aucun changement" };
  await db.update(wikiPages).set({ category: to.data }).where(and(eq(wikiPages.category, from.data)));
  refresh();
  return { ok: "Catégorie renommée" };
}
