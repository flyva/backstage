"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kanbanCards, kanbanColumns, projectMembers } from "@/db/schema";
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
  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, cid)); // les cartes suivent (cascade)
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
  assigneeId: z.string(),
  dueDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide"),
});

export async function updateCard(_: FormState, fd: FormData): Promise<FormState> {
  const cardId = id.parse(fd.get("cardId"));
  const found = await cardWithProject(cardId);
  if (!found) return { error: "Carte introuvable" };
  await requireProject(found.projectId, "editor");
  const p = cardSchema.safeParse({
    title: fd.get("title"),
    description: fd.get("description") ?? "",
    assigneeId: fd.get("assigneeId") ?? "",
    dueDate: fd.get("dueDate") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  // La personne assignée doit faire partie du projet.
  let assigneeId: number | null = null;
  if (p.data.assigneeId) {
    const uid = Number(p.data.assigneeId);
    const [m] = await db.select({ u: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, found.projectId), eq(projectMembers.userId, uid))).limit(1);
    if (!m) return { error: "Cette personne ne fait pas partie du projet" };
    assigneeId = uid;
  }
  await db.update(kanbanCards).set({
    title: p.data.title,
    description: p.data.description || null,
    assigneeId,
    dueDate: p.data.dueDate || null,
  }).where(eq(kanbanCards.id, cardId));
  touch(found.projectId);
  return { ok: "Carte mise à jour" };
}

export async function deleteCard(fd: FormData) {
  const found = await cardWithProject(id.parse(fd.get("cardId")));
  if (!found) return;
  await requireProject(found.projectId, "editor");
  await db.delete(kanbanCards).where(eq(kanbanCards.id, found.card.id));
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
