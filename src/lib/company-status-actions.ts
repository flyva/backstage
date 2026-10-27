"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { companyStatuses, STATUS_COLORS } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugifyStatusKey } from "@/lib/company-status";
import type { FormState } from "@/lib/actions";

const refresh = () => {
  revalidatePath("/admin/statuts-entreprises");
  revalidatePath("/recherche-entreprises");
};

export async function saveCompanyStatus(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const label = String(fd.get("label") ?? "").trim();
  const color = String(fd.get("color") ?? "zinc");
  if (!label) return { error: "Le nom du statut est obligatoire" };
  if (!(STATUS_COLORS as readonly string[]).includes(color)) return { error: "Couleur invalide" };
  const id = Number(fd.get("id") || 0);

  if (id) {
    await db.update(companyStatuses).set({ label, color: color as (typeof STATUS_COLORS)[number] }).where(eq(companyStatuses.id, id));
    refresh();
    return { ok: "Statut mis à jour" };
  }

  const key = slugifyStatusKey(label);
  const [dup] = await db.select({ id: companyStatuses.id }).from(companyStatuses).where(eq(companyStatuses.key, key)).limit(1);
  if (dup) return { error: "Un statut très proche existe déjà" };
  const [last] = await db.select({ position: companyStatuses.position }).from(companyStatuses).orderBy(desc(companyStatuses.position)).limit(1);
  await db.insert(companyStatuses).values({ key, label, color: color as (typeof STATUS_COLORS)[number], position: (last?.position ?? -1) + 1 });
  refresh();
  return { ok: "Statut ajouté" };
}

export async function deleteCompanyStatus(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!id) return;
  await db.delete(companyStatuses).where(eq(companyStatuses.id, id));
  refresh();
}

/** Monte ou descend un statut dans la liste (échange sa position avec le voisin). */
export async function moveCompanyStatus(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const dir = fd.get("dir") === "up" ? "up" : "down";
  const [row] = await db.select().from(companyStatuses).where(eq(companyStatuses.id, id)).limit(1);
  if (!row) return;
  const [neighbor] = dir === "up"
    ? await db.select().from(companyStatuses).where(lt(companyStatuses.position, row.position)).orderBy(desc(companyStatuses.position)).limit(1)
    : await db.select().from(companyStatuses).where(gt(companyStatuses.position, row.position)).orderBy(asc(companyStatuses.position)).limit(1);
  if (!neighbor) return;
  await db.update(companyStatuses).set({ position: neighbor.position }).where(eq(companyStatuses.id, row.id));
  await db.update(companyStatuses).set({ position: row.position }).where(eq(companyStatuses.id, neighbor.id));
  refresh();
}
