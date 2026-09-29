"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { wikiPages, wikiRevisions } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { slugify } from "@/lib/wiki";
import type { FormState } from "@/lib/actions";

const pageSchema = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(200),
  category: z.string().trim().min(1, "Catégorie requise").max(80),
  body: z.string().max(100_000, "Page trop longue (100 000 caractères max)"),
});

async function uniqueSlug(title: string) {
  const base = slugify(title);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (slug === "nouveau") continue; // réservé : /wiki/nouveau est le formulaire de création
    const [hit] = await db.select({ id: wikiPages.id }).from(wikiPages).where(eq(wikiPages.slug, slug)).limit(1);
    if (!hit) return slug;
  }
  return `${base}-${Date.now()}`;
}

export async function savePage(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = pageSchema.safeParse({ title: fd.get("title"), category: fd.get("category"), body: fd.get("body") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const { title, category, body } = p.data;
  const pageId = Number(fd.get("pageId") || 0);
  const now = new Date();

  if (!pageId) {
    const slug = await uniqueSlug(title);
    const [res] = await db.insert(wikiPages).values({ slug, title, category, body, createdBy: user.id, updatedBy: user.id, createdAt: now, updatedAt: now });
    await db.insert(wikiRevisions).values({ pageId: res.insertId, title, body, editorId: user.id, createdAt: now });
    revalidatePath("/wiki", "layout");
    redirect(`/wiki/${slug}`);
  }

  const [page] = await db.select().from(wikiPages).where(eq(wikiPages.id, pageId)).limit(1);
  if (!page) return { error: "Page introuvable" };
  await db.update(wikiPages).set({ title, category, body, updatedBy: user.id, updatedAt: now }).where(eq(wikiPages.id, pageId));
  await db.insert(wikiRevisions).values({ pageId, title, body, editorId: user.id, createdAt: now });
  revalidatePath("/wiki", "layout");
  redirect(`/wiki/${page.slug}`);
}

export async function restoreRevision(fd: FormData) {
  const user = await requireUser();
  const [rev] = await db.select().from(wikiRevisions).where(eq(wikiRevisions.id, Number(fd.get("revisionId")))).limit(1);
  if (!rev) return;
  const [page] = await db.select().from(wikiPages).where(eq(wikiPages.id, rev.pageId)).limit(1);
  if (!page) return;
  const now = new Date();
  await db.update(wikiPages).set({ title: rev.title, body: rev.body, updatedBy: user.id, updatedAt: now }).where(eq(wikiPages.id, page.id));
  // La restauration est elle-même une révision : rien n'est jamais perdu.
  await db.insert(wikiRevisions).values({ pageId: page.id, title: rev.title, body: rev.body, editorId: user.id, createdAt: now });
  revalidatePath("/wiki", "layout");
  redirect(`/wiki/${page.slug}`);
}

export async function deletePage(fd: FormData) {
  await requireAdmin();
  await db.delete(wikiPages).where(eq(wikiPages.id, Number(fd.get("pageId"))));
  revalidatePath("/wiki", "layout");
  redirect("/wiki");
}
