"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { requirePublisher } from "@/lib/news";
import { notifyCategory } from "@/lib/push";
import type { FormState } from "@/lib/actions";

const schema = z.object({
  title: z.string().trim().min(3, "Titre trop court").max(200),
  body: z.string().trim().min(1, "Le contenu est vide").max(50_000),
  scope: z.enum(["ecole", "bde"]),
  pinned: z.boolean(),
});

const refresh = () => {
  revalidatePath("/actus", "layout");
  revalidatePath("/");
};

export async function saveNews(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePublisher();
  const p = schema.safeParse({
    title: fd.get("title"),
    body: fd.get("body"),
    scope: fd.get("scope"),
    pinned: fd.get("pinned") === "on",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  // Chaque rubrique demande son droit : « BDE » ou « Actualités de l'école ».
  if (p.data.scope === "bde" ? !user.perms.bde : !user.perms.actus) return { error: "Tu n'as pas le droit de publier dans cette rubrique" };
  const postId = Number(fd.get("postId") || 0);
  const now = new Date();

  if (!postId) {
    // Seul un admin épingle un article.
    const pinned = user.perms.admin && p.data.pinned;
    const [res] = await db.insert(newsPosts).values({ ...p.data, pinned, authorId: user.id, createdAt: now, updatedAt: now });
    refresh();
    // Après la réponse : la publication n'attend pas l'envoi des notifications.
    after(() => notifyCategory("news", { title: p.data.title, body: "Nouvel article sur Backstage", url: `/actus/${res.insertId}`, tag: `news-${res.insertId}` }, user.id));
    redirect(`/actus/${res.insertId}`);
  }
  const [post] = await db.select({ authorId: newsPosts.authorId, pinned: newsPosts.pinned }).from(newsPosts).where(eq(newsPosts.id, postId)).limit(1);
  if (!post) return { error: "Article introuvable" };
  // Un rédacteur BDE ne modifie que ses articles ; l'admin modifie tout.
  if (!user.perms.admin && post.authorId !== user.id) return { error: "Tu ne peux modifier que tes propres articles" };
  await db.update(newsPosts).set({ ...p.data, pinned: user.perms.admin ? p.data.pinned : post.pinned, updatedAt: now }).where(eq(newsPosts.id, postId));
  refresh();
  redirect(`/actus/${postId}`);
}

export async function deleteNews(fd: FormData) {
  const user = await requirePublisher();
  const postId = Number(fd.get("postId"));
  const [post] = await db.select({ authorId: newsPosts.authorId }).from(newsPosts).where(eq(newsPosts.id, postId)).limit(1);
  if (!post || (!user.perms.admin && post.authorId !== user.id)) return;
  await db.delete(newsPosts).where(eq(newsPosts.id, postId));
  refresh();
  redirect("/actus");
}
