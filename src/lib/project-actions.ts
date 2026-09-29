"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  checklistItems, checklists, projectMembers, projects, users, type ProjectRole,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { CHECKLIST_TEMPLATES, requireProject } from "@/lib/projects";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const role = z.enum(["owner", "editor", "viewer"]);
const touch = (projectId: number) => revalidatePath(`/projets/${projectId}`, "layout");

// ---------- Projets ----------

const projectSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(150),
  description: z.string().trim().max(2000).optional(),
  eventDate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide")
    .optional(),
});

export async function createProject(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = projectSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const [res] = await db.insert(projects).values({
    name: p.data.name,
    description: p.data.description || null,
    eventDate: p.data.eventDate || null,
    createdBy: user.id,
  });
  await db.insert(projectMembers).values({ projectId: res.insertId, userId: user.id, role: "owner" });
  redirect(`/projets/${res.insertId}`);
}

export async function updateProject(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "owner");
  const p = projectSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  await db.update(projects).set({
    name: p.data.name,
    description: p.data.description || null,
    eventDate: p.data.eventDate || null,
  }).where(eq(projects.id, pid));
  touch(pid);
  revalidatePath("/projets");
  return { ok: "Projet mis à jour" };
}

export async function deleteProject(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "owner");
  await db.delete(projects).where(eq(projects.id, pid));
  revalidatePath("/projets");
  redirect("/projets");
}

// ---------- Membres ----------

async function ownerCount(projectId: number) {
  const [r] = await db
    .select({ n: count() })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, "owner")));
  return r.n;
}

export async function addMember(_: FormState, fd: FormData): Promise<FormState> {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "owner");
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  const r = role.safeParse(fd.get("role"));
  if (!email.success || !r.success) return { error: "Email ou rôle invalide" };

  const [target] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email.data)).limit(1);
  if (!target) return { error: "Aucun compte avec cet email : la personne doit d'abord s'inscrire sur Backstage." };

  const [already] = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, pid), eq(projectMembers.userId, target.id)))
    .limit(1);
  if (already) return { error: `${target.name} fait déjà partie du projet` };

  await db.insert(projectMembers).values({ projectId: pid, userId: target.id, role: r.data });
  touch(pid);
  return { ok: `${target.name} a été ajouté(e)` };
}

export async function setMemberRole(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  const uid = id.parse(fd.get("userId"));
  await requireProject(pid, "owner");
  const r = role.parse(fd.get("role"));
  const [current] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, pid), eq(projectMembers.userId, uid)))
    .limit(1);
  if (!current) return;
  // Un projet doit toujours garder au moins un propriétaire.
  if (current.role === "owner" && r !== "owner" && (await ownerCount(pid)) <= 1) return;
  await db
    .update(projectMembers)
    .set({ role: r as ProjectRole })
    .where(and(eq(projectMembers.projectId, pid), eq(projectMembers.userId, uid)));
  touch(pid);
}

export async function removeMember(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  const uid = id.parse(fd.get("userId"));
  const { user, role: myRole } = await requireProject(pid, "viewer");
  // Un propriétaire retire n'importe qui ; chacun peut se retirer soi-même.
  if (uid !== user.id && myRole !== "owner") return;
  const [target] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, pid), eq(projectMembers.userId, uid)))
    .limit(1);
  if (!target) return;
  if (target.role === "owner" && (await ownerCount(pid)) <= 1) return;
  await db.delete(projectMembers).where(and(eq(projectMembers.projectId, pid), eq(projectMembers.userId, uid)));
  touch(pid);
  revalidatePath("/projets");
  if (uid === user.id) redirect("/projets");
}

// ---------- Checklists ----------

async function nextPosition(table: "checklists" | "items", parentId: number) {
  if (table === "checklists") {
    const [r] = await db.select({ m: max(checklists.position) }).from(checklists).where(eq(checklists.projectId, parentId));
    return (r.m ?? -1) + 1;
  }
  const [r] = await db.select({ m: max(checklistItems.position) }).from(checklistItems).where(eq(checklistItems.checklistId, parentId));
  return (r.m ?? -1) + 1;
}

export async function addChecklist(fd: FormData) {
  const pid = id.parse(fd.get("projectId"));
  await requireProject(pid, "editor");
  const template = CHECKLIST_TEMPLATES[String(fd.get("template") ?? "")];
  const parsed = z.string().trim().min(1).max(150).safeParse(fd.get("title"));
  const title = template?.title ?? (parsed.success ? parsed.data : null);
  if (!title) return; // ni modèle ni titre : rien à créer
  const [res] = await db.insert(checklists).values({ projectId: pid, title, position: await nextPosition("checklists", pid) });
  if (template) {
    await db.insert(checklistItems).values(
      template.items.map((label, position) => ({ checklistId: res.insertId, label, position })),
    );
  }
  touch(pid);
}

/** Retrouve le projet d'une checklist (jamais fait confiance à un projectId venu du client). */
async function projectOfChecklist(checklistId: number) {
  const [row] = await db.select({ projectId: checklists.projectId }).from(checklists).where(eq(checklists.id, checklistId)).limit(1);
  return row?.projectId ?? null;
}

export async function deleteChecklist(fd: FormData) {
  const cid = id.parse(fd.get("checklistId"));
  const pid = await projectOfChecklist(cid);
  if (!pid) return;
  await requireProject(pid, "editor");
  await db.delete(checklists).where(eq(checklists.id, cid));
  touch(pid);
}

export async function addItem(fd: FormData) {
  const cid = id.parse(fd.get("checklistId"));
  const label = z.string().trim().min(1).max(255).safeParse(fd.get("label"));
  const pid = await projectOfChecklist(cid);
  if (!pid || !label.success) return;
  await requireProject(pid, "editor");
  await db.insert(checklistItems).values({ checklistId: cid, label: label.data, position: await nextPosition("items", cid) });
  touch(pid);
}

async function projectOfItem(itemId: number) {
  const [row] = await db
    .select({ projectId: checklists.projectId })
    .from(checklistItems)
    .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
    .where(eq(checklistItems.id, itemId))
    .limit(1);
  return row?.projectId ?? null;
}

export async function toggleItem(itemId: number, done: boolean) {
  const iid = id.parse(itemId);
  const pid = await projectOfItem(iid);
  if (!pid) return;
  await requireProject(pid, "editor");
  await db.update(checklistItems).set({ done }).where(eq(checklistItems.id, iid));
  touch(pid);
}

export async function deleteItem(fd: FormData) {
  const iid = id.parse(fd.get("itemId"));
  const pid = await projectOfItem(iid);
  if (!pid) return;
  await requireProject(pid, "editor");
  await db.delete(checklistItems).where(eq(checklistItems.id, iid));
  touch(pid);
}
