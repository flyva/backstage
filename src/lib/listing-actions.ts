"use server";

import { revalidatePath } from "next/cache";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, gt, count } from "drizzle-orm";
import { db } from "@/db";
import { LISTING_CATEGORIES, conversations, listings, type ListingCategory } from "@/db/schema";
import { notifyUser } from "@/lib/push";
import { requireUser } from "@/lib/auth";
import { sniffAvatar } from "@/lib/avatar-files";
import { ensureListingDir, listingDir, newListingPhotoName, removeListingPhoto } from "@/lib/listing-files";
import { LISTING_TTL_DAYS, MAX_LISTING_PHOTO_BYTES } from "@/lib/listing-shared";
import { allow } from "@/lib/rate-limit";
import type { FormState } from "@/lib/actions";

const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
const MAX_ACTIVE_PER_USER = 20;

/** Publication immédiate : aucune validation préalable. */
export async function createListing(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const category = String(fd.get("category") ?? "");
  if (!(LISTING_CATEGORIES as readonly string[]).includes(category)) return { error: "Choisis une catégorie" };
  const title = text(fd, "title", 120);
  const description = text(fd, "description", 2000);
  const contact = text(fd, "contact", 160);
  if (!title) return { error: "Le titre est obligatoire" };
  if (!description) return { error: "Décris ton annonce" };
  if (!contact) return { error: "Indique comment te joindre (e-mail, téléphone, Instagram…)" };
  if (!allow(`listing:${user.id}`, 10, 24 * 3600e3)) return { error: "10 annonces par jour maximum : réessaie demain." };
  const [{ n }] = await db.select({ n: count() }).from(listings).where(and(eq(listings.userId, user.id), eq(listings.status, "active"), gt(listings.expiresAt, new Date())));
  if (n >= MAX_ACTIVE_PER_USER) return { error: `${MAX_ACTIVE_PER_USER} annonces actives maximum : ferme ou supprime les anciennes.` };

  let photoFile: string | null = null;
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_LISTING_PHOTO_BYTES) return { error: "Photo trop lourde (400 Ko maximum)" };
    const buf = new Uint8Array(await photo.arrayBuffer());
    const type = sniffAvatar(buf);
    if (!type) return { error: "Format de photo non pris en charge (JPEG, PNG ou WebP)" };
    await ensureListingDir();
    photoFile = newListingPhotoName(type.ext);
    await writeFile(path.join(/*turbopackIgnore: true*/ listingDir(), photoFile), buf);
  }

  await db.insert(listings).values({
    userId: user.id, category: category as ListingCategory, title, description, contact, photoFile,
    price: text(fd, "price", 40) || null,
    expiresAt: new Date(Date.now() + LISTING_TTL_DAYS * 864e5),
  });
  revalidatePath("/annonces");
  return { ok: "Annonce publiée" };
}

async function ownListing(id: number) {
  const user = await requireUser();
  const [l] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  // L'auteur ou un administrateur.
  if (!l || (l.userId !== user.id && !user.perms.administration)) return null;
  return l;
}

/** Republie une annonce terminée ou expirée pour 60 jours (la mention « conclue avec… » est retirée). */
export async function setListingStatus(fd: FormData) {
  const l = await ownListing(Number(fd.get("id")));
  if (!l) return;
  await db.update(listings).set({ status: "active", soldToId: null, expiresAt: new Date(Date.now() + LISTING_TTL_DAYS * 864e5) }).where(eq(listings.id, l.id));
  revalidatePath("/annonces", "layout");
}

/**
 * Conclut l'annonce (vendue, donnée, pourvue) : soit avec une personne qui a écrit sur l'annonce, soit sans (retirée).
 * Seul l'acheteur ainsi désigné pourra échanger des avis avec l'auteur.
 */
export async function concludeListing(fd: FormData) {
  const l = await ownListing(Number(fd.get("id")));
  if (!l) return;
  const buyerId = Number(fd.get("buyerId"));
  let soldToId: number | null = null;
  if (Number.isInteger(buyerId) && buyerId > 0) {
    const [c] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.listingId, l.id), eq(conversations.buyerId, buyerId))).limit(1);
    if (!c) return;
    soldToId = buyerId;
  }
  await db.update(listings).set({ status: "closed", soldToId }).where(eq(listings.id, l.id));
  if (soldToId) {
    const [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.listingId, l.id), eq(conversations.buyerId, soldToId))).limit(1);
    await notifyUser(soldToId, { title: `Annonce conclue : ${l.title}`, body: "Tu peux maintenant laisser un avis sur l'échange.", url: `/messages/${conv.id}`, tag: `sold-${l.id}` }).catch(() => 0);
  }
  revalidatePath("/annonces", "layout");
  revalidatePath("/messages", "layout");
}

export async function deleteListing(fd: FormData) {
  const l = await ownListing(Number(fd.get("id")));
  if (!l) return;
  await removeListingPhoto(l.photoFile);
  await db.delete(listings).where(eq(listings.id, l.id));
  revalidatePath("/annonces");
}
