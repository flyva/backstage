"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kanbanCardAssignees, kanbanCards, kanbanChecklist, kanbanColumns, kanbanComments, projectFiles, projectMembers } from "@/db/schema";
import { removeProjectFile } from "@/lib/project-files";
import { can } from "@/lib/projects";
import { DEFAULT_KANBAN_COLUMNS, requireProject } from "@/lib/projects";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const touch = (projectId: number) => revalidatePath(`/projets/${projectId}/kanban`);

// L'identifiant de projet n'est jamais pris du client : on le retrouve depuis la colonne / la carte.
async function projectOfColumn(columnId: number) {
  const [r] = await db.select({ projectId: kanbanColumns.projectId }).from(kanbanColumns).where(eq(kanbanColumns.id, columnId)).limit(1);
  return r?.projectId ?? null;
}
async function cardWithProject(cardId: number) {
  const [r] = await db
    .select({ card: kanbanCards, projectId: kanbanColumns.projectId })
    .from(kanbanCards)
    .innerJoin(kanbanColumns, eq(kanbanColumns.id, kanbanCards.columnId))
    .where(eq(kanbanCards.id, cardId))
    .limit(1);
  return r ?? null;
}

// Noms des fichiers (sur le disque) attachés à ces cartes : la base est nettoyée en cascade, pas le disque.
async function cardFileNames(cardIds: number[]) {
  if (cardIds.length === 0) return [];
  const rows = await db.select({ file: projectFiles.file }).from(projectFiles).where(inArray(projectFiles.cardId, cardIds));
  return rows.map((r) => r.file);
}

// ---------- Colonnes ----------

export async function createDefaultColumns(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const [r] = await db.select({ m: max(kanbanColumns.position) }).from(kanbanColumns).where(eq(kanbanColumns.projectId, pid));
  if (r.m !== null) return; // il y a déjà des colonnes
  await db.insert(kanbanColumns).values(DEFAULT_KANBAN_COLUMNS.map((title, position) => ({ projectId: pid, title, position })));
  touch(pid);
}

export async function addColumn(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const title = z.string().trim().min(1).max(80).safeParse(fd.get("title"));
  if (!title.success) return;
  const [r] = await db.select({ m: max(kanbanColumns.position) }).from(kanbanColumns).where(eq(kanbanColumns.projectId, pid));
  await db.insert(kanbanColumns).values({ projectId: pid, title: title.data, position: (r.m ?? -1) + 1 });
  touch(pid);
}

export async function renameColumn(fd: FormData) {
  const cid = id.parse(fd.get("columnId"));
  const pid = await projectOfColumn(cid);
  if (!pid) return;
  await requireProject(pid, "editor");
  const title = z.string().trim().min(1).max(80).safeParse(fd.get("title"));
  if (!title.success) return;
  await db.update(kanbanColumns).set({ title: title.data }).where(eq(kanbanColumns.id, cid));
  touch(pid);
}

export async function deleteColumn(fd: FormData) {
  const cid = id.parse(fd.get("columnId"));
  const pid = await projectOfColumn(cid);
  if (!pid) return;
  await requireProject(pid, "editor");
  const cardIds = (await db.select({ id: kanbanCards.id }).from(kanbanCards).where(eq(kanbanCards.columnId, cid))).map((c) => c.id);
  const names = await cardFileNames(cardIds);
  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, cid)); // les cartes, leurs fichiers, tâches et commentaires suivent (cascade)
  await Promise.all(names.map(removeProjectFile));
  touch(pid);
}

export async function moveColumn(fd: FormData) {
  const cid = id.parse(fd.get("columnId"));
  const dir = fd.get("dir") === "left" ? -1 : 1;
  const pid = await projectOfColumn(cid);
  if (!pid) return;
  await requireProject(pid, "editor");
  await db.transaction(async (tx) => {
    const list = await tx.select({ id: kanbanColumns.id }).from(kanbanColumns).where(eq(kanbanColumns.projectId, pid)).orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id));
    const i = list.findIndex((c) => c.id === cid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    for (const [position, c] of list.entries()) await tx.update(kanbanColumns).set({ position }).where(eq(kanbanColumns.id, c.id));
  });
  touch(pid);
}

// ---------- Cartes ----------

export async function addCard(fd: FormData) {
  const cid = id.parse(fd.get("columnId"));
  const pid = await projectOfColumn(cid);
  if (!pid) return;
  const { user } = await requireProject(pid, "editor");
  const title = z.string().trim().min(1).max(200).safeParse(fd.get("title"));
  if (!title.success) return;
  const [r] = await db.select({ m: max(kanbanCards.position) }).from(kanbanCards).where(eq(kanbanCards.columnId, cid));
  await db.insert(kanbanCards).values({ columnId: cid, title: title.data, position: (r.m ?? -1) + 1, createdBy: user.id });
  touch(pid);
}

const cardSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200),
  description: z.string().trim().max(4000),
  startDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide"),
  dueDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  labels: z.string().trim().max(200),
});

/** « son, lumière , son » → « son,lumière » : sans doublons, 8 étiquettes de 24 caractères au plus. */
function normalizeLabels(raw: string): string | null {
  const seen = new Set<string>();
  for (const l of raw.split(",")) {
    const t = l.trim().slice(0, 24);
    if (t) seen.add(t);
  }
  const out = [...seen].slice(0, 8).join(",");
  return out || null;
}

export async function updateCard(_: FormState, fd: FormData): Promise<FormState> {
  const cardId = id.parse(fd.get("cardId"));
  const found = await cardWithProject(cardId);
  if (!found) return { error: "Carte introuvable" };
  await requireProject(found.projectId, "editor");
  const p = cardSchema.safeParse({
    title: fd.get("title"),
    description: fd.get("description") ?? "",
    startDate: fd.get("startDate") ?? "",
    dueDate: fd.get("dueDate") ?? "",
    priority: fd.get("priority") ?? "normal",
    labels: fd.get("labels") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  // Les personnes assignées doivent toutes faire partie du projet.
  const wanted = [...new Set(fd.getAll("assigneeIds").map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (wanted.length > 0) {
    const ok = await db.select({ u: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, found.projectId), inArray(projectMembers.userId, wanted)));
    if (ok.length !== wanted.length) return { error: "Une personne assignée ne fait pas partie du projet" };
  }
  await db.update(kanbanCards).set({
    title: p.data.title,
    description: p.data.description || null,
    startDate: p.data.startDate || null,
    dueDate: p.data.dueDate || null,
    priority: p.data.priority,
    labels: normalizeLabels(p.data.labels),
  }).where(eq(kanbanCards.id, cardId));
  await db.delete(kanbanCardAssignees).where(eq(kanbanCardAssignees.cardId, cardId));
  if (wanted.length > 0) await db.insert(kanbanCardAssignees).values(wanted.map((userId) => ({ cardId, userId })));
  touch(found.projectId);
  return { ok: "Carte mise à jour" };
}

export async function deleteCard(fd: FormData) {
  const found = await cardWithProject(id.parse(fd.get("cardId")));
  if (!found) return;
  await requireProject(found.projectId, "editor");
  const names = await cardFileNames([found.card.id]);
  await db.delete(kanbanCards).where(eq(kanbanCards.id, found.card.id));
  await Promise.all(names.map(removeProjectFile));
  touch(found.projectId);
}

/** Déplace une carte vers une colonne (même projet) à la position donnée. Appelée par le glisser-déposer. */
export async function moveCard(cardId: number, toColumnId: number, index: number) {
  const found = await cardWithProject(id.parse(cardId));
  if (!found) return;
  await requireProject(found.projectId, "editor");
  const targetProject = await projectOfColumn(id.parse(toColumnId));
  if (targetProject !== found.projectId) return; // jamais vers un autre projet

  await db.transaction(async (tx) => {
    const list = await tx
      .select({ id: kanbanCards.id })
      .from(kanbanCards)
      .where(eq(kanbanCards.columnId, toColumnId))
      .orderBy(asc(kanbanCards.position), asc(kanbanCards.id));
    const ids = list.map((c) => c.id).filter((x) => x !== found.card.id);
    ids.splice(Math.max(0, Math.min(index, ids.length)), 0, found.card.id);
    for (const [position, cid] of ids.entries()) {
      await tx.update(kanbanCards).set({ position, columnId: toColumnId }).where(eq(kanbanCards.id, cid));
    }
  });
  touch(found.projectId);
}

// ---------- Tâches (checklist), commentaires, fichiers d'une carte ----------

async function itemWithProject(itemId: number) {
  const [r] = await db
    .select({ item: kanbanChecklist, projectId: kanbanColumns.projectId })
    .from(kanbanChecklist)
    .innerJoin(kanbanCards, eq(kanbanCards.id, kanbanChecklist.cardId))
    .innerJoin(kanbanColumns, eq(kanbanColumns.id, kanbanCards.columnId))
    .where(eq(kanbanChecklist.id, itemId))
    .limit(1);
  return r ?? null;
}

export async function addChecklistItem(cardId: number, text: string) {
  const found = await cardWithProject(id.parse(cardId));
  if (!found) return;
  await requireProject(found.projectId, "editor");
  const t = z.string().trim().min(1).max(200).safeParse(text);
  if (!t.success) return;
  const [r] = await db.select({ m: max(kanbanChecklist.position) }).from(kanbanChecklist).where(eq(kanbanChecklist.cardId, found.card.id));
  await db.insert(kanbanChecklist).values({ cardId: found.card.id, text: t.data, position: (r.m ?? -1) + 1 });
  touch(found.projectId);
}

export async function toggleChecklistItem(itemId: number, done: boolean) {
  const found = await itemWithProject(id.parse(itemId));
  if (!found) return;
  await requireProject(found.projectId, "editor");
  await db.update(kanbanChecklist).set({ done: !!done }).where(eq(kanbanChecklist.id, found.item.id));
  touch(found.projectId);
}

export async function deleteChecklistItem(itemId: number) {
  const found = await itemWithProject(id.parse(itemId));
  if (!found) return;
  await requireProject(found.projectId, "editor");
  await db.delete(kanbanChecklist).where(eq(kanbanChecklist.id, found.item.id));
  touch(found.projectId);
}

export async function addComment(cardId: number, body: string) {
  const found = await cardWithProject(id.parse(cardId));
  if (!found) return;
  const { user } = await requireProject(found.projectId); // tous les membres peuvent commenter
  const b = z.string().trim().min(1).max(2000).safeParse(body);
  if (!b.success) return;
  await db.insert(kanbanComments).values({ cardId: found.card.id, userId: user.id, body: b.data });
  touch(found.projectId);
}

export async function deleteComment(commentId: number) {
  const [c] = await db
    .select({ c: kanbanComments, projectId: kanbanColumns.projectId })
    .from(kanbanComments)
    .innerJoin(kanbanCards, eq(kanbanCards.id, kanbanComments.cardId))
    .innerJoin(kanbanColumns, eq(kanbanColumns.id, kanbanCards.columnId))
    .where(eq(kanbanComments.id, id.parse(commentId)))
    .limit(1);
  if (!c) return;
  const { user, role } = await requireProject(c.projectId);
  if (c.c.userId !== user.id && !can(role, "owner")) return; // son propre commentaire, ou le propriétaire du projet
  await db.delete(kanbanComments).where(eq(kanbanComments.id, c.c.id));
  touch(c.projectId);
}

export async function deleteCardFile(fileId: number) {
  const [f] = await db.select().from(projectFiles).where(eq(projectFiles.id, id.parse(fileId))).limit(1);
  if (!f || f.cardId === null) return;
  await requireProject(f.projectId, "editor");
  await db.delete(projectFiles).where(eq(projectFiles.id, f.id));
  await removeProjectFile(f.file);
  touch(f.projectId);
}
