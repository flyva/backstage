"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { RESOURCE_CATEGORIES, resourceFavorites, resourceLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/actions";
import type { ResourceCategory } from "@/lib/resource-links";

const refresh = (category: string) => revalidatePath(`/recherche-entreprises/${category.replace(/_/g, "-")}`);

/** Ajoute un lien à la liste PARTAGÉE (n'importe qui peut compléter : un champ pour ajouter une autre page). */
export async function createResourceLink(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const category = String(fd.get("category") ?? "");
  const label = String(fd.get("label") ?? "").trim();
  const url = String(fd.get("url") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  if (!(RESOURCE_CATEGORIES as readonly string[]).includes(category)) return { error: "Catégorie invalide" };
  if (!label) return { error: "Le nom est obligatoire" };
  if (!/^https?:\/\/.+/.test(url)) return { error: "Lien invalide (doit commencer par http:// ou https://)" };

  await db.insert(resourceLinks).values({ category: category as ResourceCategory, label, url, description, createdByUserId: user.id });
  refresh(category);
  return { ok: "Lien ajouté" };
}

/** Supprime un lien de la liste partagée : seulement permis à qui l'a ajouté (ou un administrateur). */
export async function deleteResourceLink(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!id) return;
  const [link] = await db.select({ createdByUserId: resourceLinks.createdByUserId, category: resourceLinks.category }).from(resourceLinks).where(eq(resourceLinks.id, id)).limit(1);
  if (!link) return;
  if (link.createdByUserId !== user.id && !user.perms.admin) return;
  await db.delete(resourceLinks).where(eq(resourceLinks.id, id));
  refresh(link.category);
}

/** Favori personnel (toggle) : garde ce lien bien en vue, sans rien changer pour les autres. */
export async function toggleResourceFavorite(fd: FormData) {
  const user = await requireUser();
  const resourceId = Number(fd.get("resourceId"));
  const category = String(fd.get("category") ?? "");
  if (!resourceId) return;
  const [existing] = await db.select().from(resourceFavorites).where(and(eq(resourceFavorites.resourceId, resourceId), eq(resourceFavorites.userId, user.id))).limit(1);
  if (existing) await db.delete(resourceFavorites).where(and(eq(resourceFavorites.resourceId, resourceId), eq(resourceFavorites.userId, user.id)));
  else await db.insert(resourceFavorites).values({ resourceId, userId: user.id });
  refresh(category);
}
