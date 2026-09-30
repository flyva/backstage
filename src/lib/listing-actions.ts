"use server";

import { revalidatePath } from "next/cache";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq, gt, count } from "drizzle-orm";
import { db } from "@/db";
import { LISTING_CATEGORIES, conversations, listingPhotos, listings, type ListingCategory } from "@/db/schema";
import { notifyUser } from "@/lib/push";
import { requireUser } from "@/lib/auth";
import { sniffAvatar } from "@/lib/avatar-files";
import { ensureListingDir, listingDir, newListingPhotoName, removeListingPhoto } from "@/lib/listing-files";
import { LISTING_TTL_DAYS, MAX_LISTING_PHOTOS, MAX_LISTING_PHOTO_BYTES } from "@/lib/listing-shared";
import { allow } from "@/lib/rate-limit";
import type { FormState } from "@/lib/actions";

const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
const MAX_ACTIVE_PER_USER = 20;

/**
 * Enregistre des photos dans data/uploads/listings (elles sont ensuite servies par /api/listing-photo/<nom>).
 * Le type réel est lu dans les octets du fichier. Si une photo est refusée, celles déjà écrites sont effacées.
 */
async function savePhotoFiles(files: File[]): Promise<{ names: string[] } | { error: string }> {
  const valid = files.filter((f) => f instanceof File && f.size > 0);
  const names: string[] = [];
  if (valid.length > 0) await ensureListingDir();
  for (const f of valid) {
    let fail: string | null = null;
    let buf: Uint8Array | null = null;
    if (f.size > MAX_LISTING_PHOTO_BYTES) fail = "Photo trop lourde (400 Ko maximum par photo)";
    else {
      buf = new Uint8Array(await f.arrayBuffer());
      if (!sniffAvatar(buf)) fail = "Format de photo non pris en charge (JPEG, PNG ou WebP)";
    }
    if (fail || !buf) {
      await Promise.all(names.map((n) => removeListingPhoto(n)));
      return { error: fail ?? "Photo illisible" };
    }
    const name = newListingPhotoName(sniffAvatar(buf)!.ext);
    await writeFile(path.join(/*turbopackIgnore: true*/ listingDir(), name), buf);
    names.push(name);
  }
  return { names };
}

const photosOf = (fd: FormData) => fd.getAll("photos").filter((f): f is File => f instanceof File);

/** Publication immédiate : aucune validation préalable. La première photo envoyée est la photo principale. */
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
  const files = photosOf(fd).filter((f) => f.size > 0);
  if (files.length > MAX_LISTING_PHOTOS) return { error: `${MAX_LISTING_PHOTOS} photos maximum` };
  if (!allow(`listing:${user.id}`, 10, 24 * 3600e3)) return { error: "10 annonces par jour maximum : réessaie demain." };
  const [{ n }] = await db.select({ n: count() }).from(listings).where(and(eq(listings.userId, user.id), eq(listings.status, "active"), gt(listings.expiresAt, new Date())));
  if (n >= MAX_ACTIVE_PER_USER) return { error: `${MAX_ACTIVE_PER_USER} annonces actives maximum : ferme ou supprime les anciennes.` };

  const saved = await savePhotoFiles(files);
  if ("error" in saved) return { error: saved.error };

  const [res] = await db.insert(listings).values({
    userId: user.id, category: category as ListingCategory, title, description, contact, photoFile: saved.names[0] ?? null,
    price: text(fd, "price", 40) || null,
    expiresAt: new Date(Date.now() + LISTING_TTL_DAYS * 864e5),
  });
  if (saved.names.length > 1) await db.insert(listingPhotos).values(saved.names.slice(1).map((file, i) => ({ listingId: res.insertId, file, position: i + 1 })));
  revalidatePath("/annonces", "layout");
  return { ok: "Annonce publiée" };
}

async function ownListing(id: number) {
  const user = await requireUser();
  const [l] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  // L'auteur ou un administrateur.
  if (!l || (l.userId !== user.id && !user.perms.administration)) return null;
  return l;
}

// ---------- Photos d'une annonce existante ----------

/** Ajoute des photos secondaires (la première devient la principale si l'annonce n'en avait pas). */
export async function addListingPhotos(_: FormState, fd: FormData): Promise<FormState> {
  const l = await ownListing(Number(fd.get("id")));
  if (!l) return { error: "Annonce introuvable" };
  const files = photosOf(fd).filter((f) => f.size > 0);
  if (files.length === 0) return { error: "Choisis au moins une photo" };
  const secondary = await db.select().from(listingPhotos).where(eq(listingPhotos.listingId, l.id)).orderBy(asc(listingPhotos.position), asc(listingPhotos.id));
  const total = (l.photoFile ? 1 : 0) + secondary.length;
  if (total + files.length > MAX_LISTING_PHOTOS) return { error: `${MAX_LISTING_PHOTOS} photos maximum (il en reste ${Math.max(0, MAX_LISTING_PHOTOS - total)})` };

  const saved = await savePhotoFiles(files);
  if ("error" in saved) return { error: saved.error };
  let names = saved.names;
  if (!l.photoFile) {
    await db.update(listings).set({ photoFile: names[0] }).where(eq(listings.id, l.id));
    names = names.slice(1);
  }
  const start = Math.max(0, ...secondary.map((p) => p.position)) + 1;
  if (names.length) await db.insert(listingPhotos).values(names.map((file, i) => ({ listingId: l.id, file, position: start + i })));
  revalidatePath("/annonces", "layout");
  return { ok: files.length > 1 ? "Photos ajoutées" : "Photo ajoutée" };
}

/** Supprime une photo. Si c'est la principale, la première photo secondaire la remplace. */
export async function deleteListingPhoto(fd: FormData) {
  const l = await ownListing(Number(fd.get("id")));
  if (!l) return;
  const file = String(fd.get("file") ?? "");
  const secondary = await db.select().from(listingPhotos).where(eq(listingPhotos.listingId, l.id)).orderBy(asc(listingPhotos.position), asc(listingPhotos.id));
  if (file === l.photoFile) {
    const next = secondary[0];
    await db.update(listings).set({ photoFile: next?.file ?? null }).where(eq(listings.id, l.id));
    if (next) await db.delete(listingPhotos).where(eq(listingPhotos.id, next.id));
  } else {
    const row = secondary.find((p) => p.file === file);
    if (!row) return;
    await db.delete(listingPhotos).where(eq(listingPhotos.id, row.id));
  }
  await removeListingPhoto(file);
  revalidatePath("/annonces", "layout");
}

/** Définit une photo secondaire comme photo principale (l'ancienne principale devient la première secondaire). */
export async function makeMainListingPhoto(fd: FormData) {
  const l = await ownListing(Number(fd.get("id")));
  if (!l) return;
  const file = String(fd.get("file") ?? "");
  const [row] = await db.select().from(listingPhotos).where(and(eq(listingPhotos.listingId, l.id), eq(listingPhotos.file, file))).limit(1);
  if (!row) return;
  await db.delete(listingPhotos).where(eq(listingPhotos.id, row.id));
  if (l.photoFile) await db.insert(listingPhotos).values({ listingId: l.id, file: l.photoFile, position: 0 });
  await db.update(listings).set({ photoFile: row.file }).where(eq(listings.id, l.id));
  revalidatePath("/annonces", "layout");
}

// ---------- Cycle de vie de l'annonce ----------

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
  // Toutes les photos (principale et secondaires) sont effacées du disque avec l'annonce.
  const secondary = await db.select({ file: listingPhotos.file }).from(listingPhotos).where(eq(listingPhotos.listingId, l.id));
  await Promise.all([l.photoFile, ...secondary.map((p) => p.file)].map((f) => removeListingPhoto(f)));
  await db.delete(listings).where(eq(listings.id, l.id)); // les lignes listing_photos partent en cascade
  revalidatePath("/annonces", "layout");
}
