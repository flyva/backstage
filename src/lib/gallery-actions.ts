"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { galleryAlbums, galleryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { removeMedia } from "@/lib/gallery";
import type { FormState } from "@/lib/actions";

const isStaff = (role: string) => role === "admin" || role === "bde";
const refresh = () => revalidatePath("/galerie", "layout");

export async function createAlbum(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = z
    .object({ title: z.string().trim().min(2, "Titre trop court").max(150), description: z.string().trim().max(500) })
    .safeParse({ title: fd.get("title"), description: fd.get("description") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const [res] = await db.insert(galleryAlbums).values({ title: p.data.title, description: p.data.description || null, createdBy: user.id });
  refresh();
  redirect(`/galerie/${res.insertId}`);
}

export async function deleteItem(fd: FormData) {
  const user = await requireUser();
  const [item] = await db.select().from(galleryItems).where(eq(galleryItems.id, Number(fd.get("itemId")))).limit(1);
  // L'auteur de l'envoi, ou l'équipe (admin / BDE) pour modérer.
  if (!item || (item.uploaderId !== user.id && !isStaff(user.role))) return;
  await db.delete(galleryItems).where(eq(galleryItems.id, item.id));
  await removeMedia(item.file, item.thumb);
  refresh();
}

export async function deleteAlbum(fd: FormData) {
  const user = await requireUser();
  const albumId = Number(fd.get("albumId"));
  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId)).limit(1);
  if (!album || (album.createdBy !== user.id && !isStaff(user.role))) return;
  const items = await db.select().from(galleryItems).where(eq(galleryItems.albumId, albumId));
  await db.delete(galleryAlbums).where(eq(galleryAlbums.id, albumId)); // les lignes d'items suivent (cascade)
  for (const i of items) await removeMedia(i.file, i.thumb);
  refresh();
  redirect("/galerie");
}
