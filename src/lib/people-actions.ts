"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { LINK_KINDS, networkContacts, tracks, userLinks, users, type LinkKind } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { AVATAR_NAME, MAX_AVATAR_BYTES, avatarDir, ensureAvatarDir, newAvatarName, sniffAvatar } from "@/lib/avatar-files";
import { PHONE_RE, normalizeUrl } from "@/lib/people-shared";
import { allow } from "@/lib/rate-limit";
import type { FormState } from "@/lib/actions";

const MAX_LINKS = 12;
const MAX_CONTACTS = 500;
const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

// ---------- Fiche personnelle ----------

export async function saveFiche(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const trackRaw = Number(fd.get("trackId"));
  let trackId: number | null = null;
  if (Number.isInteger(trackRaw) && trackRaw > 0) {
    const [t] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, trackRaw)).limit(1);
    if (!t) return { error: "Filière inconnue" };
    trackId = t.id;
  }
  const headline = text(fd, "headline", 120);
  const phone = text(fd, "phone", 30);
  if (phone && !PHONE_RE.test(phone)) return { error: "Numéro de téléphone invalide (chiffres, espaces, + . - ( ) uniquement)" };
  const contactEmail = text(fd, "contactEmail", 190).toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { error: "Adresse e-mail de contact invalide" };
  await db.update(users).set({
    trackId, headline: headline || null, phone: phone || null, contactEmail: contactEmail || null,
    showInDirectory: fd.get("showInDirectory") === "on", showPhone: fd.get("showPhone") === "on",
  }).where(eq(users.id, user.id));
  revalidatePath("/profil");
  revalidatePath("/annuaire");
  return { ok: "Fiche enregistrée" };
}

// ---------- Photo de profil ----------

export async function uploadAvatar(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!allow(`avatar:${user.id}`, 10, 60 * 60e3)) return { error: "Trop d'envois : réessaie plus tard." };
  const file = fd.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis une image" };
  if (file.size > MAX_AVATAR_BYTES) return { error: "Image trop lourde (400 Ko maximum)" };
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniffAvatar(buf);
  if (!type) return { error: "Format non pris en charge : utilise une image JPEG, PNG ou WebP" };
  await ensureAvatarDir();
  const name = newAvatarName(type.ext);
  await writeFile(path.join(avatarDir(), name), buf);
  await removeAvatarFile(user.avatarFile);
  await db.update(users).set({ avatarFile: name }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: "Photo enregistrée" };
}

export async function removeAvatar() {
  const user = await requireUser();
  await removeAvatarFile(user.avatarFile);
  await db.update(users).set({ avatarFile: null }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}

async function removeAvatarFile(file: string | null | undefined) {
  if (file && AVATAR_NAME.test(file)) await unlink(path.join(avatarDir(), file)).catch(() => {});
}

// ---------- Liens (réseaux, portfolio) ----------

export async function addLink(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const kind = String(fd.get("kind") ?? "");
  if (!(LINK_KINDS as readonly string[]).includes(kind)) return { error: "Type de lien inconnu" };
  const url = normalizeUrl(String(fd.get("url") ?? ""));
  if (!url) return { error: "Adresse invalide : colle le lien complet (par exemple https://www.linkedin.com/in/ton-profil)" };
  const label = text(fd, "label", 60);
  const [{ n }] = await db.select({ n: count() }).from(userLinks).where(eq(userLinks.userId, user.id));
  if (n >= MAX_LINKS) return { error: `${MAX_LINKS} liens maximum` };
  await db.insert(userLinks).values({ userId: user.id, kind: kind as LinkKind, url, label: label || null, sortOrder: n });
  revalidatePath("/profil");
  revalidatePath("/annuaire");
  return { ok: "Lien ajouté" };
}

export async function deleteLink(fd: FormData) {
  const user = await requireUser();
  await db.delete(userLinks).where(and(eq(userLinks.id, Number(fd.get("id"))), eq(userLinks.userId, user.id)));
  revalidatePath("/profil");
  revalidatePath("/annuaire");
}

// ---------- Carte de visite ----------

const newSlug = () => randomBytes(6).toString("hex"); // 12 caractères, non devinable

export async function setCardEnabled(fd: FormData) {
  const user = await requireUser();
  const enabled = fd.get("enabled") === "1";
  await db.update(users).set({ cardEnabled: enabled, cardSlug: user.cardSlug ?? newSlug() }).where(eq(users.id, user.id));
  revalidatePath("/profil");
}

/** Nouvelle adresse pour la carte : l'ancien lien cesse de fonctionner. */
export async function regenerateCardSlug() {
  const user = await requireUser();
  await db.update(users).set({ cardSlug: newSlug() }).where(eq(users.id, user.id));
  revalidatePath("/profil");
}

// ---------- Carnet de réseau ----------

export async function saveNetworkContact(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(fd, "name", 120);
  if (!name) return { error: "Le nom est obligatoire" };
  const email = text(fd, "email", 190);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Adresse e-mail invalide" };
  const phone = text(fd, "phone", 30);
  if (phone && !PHONE_RE.test(phone)) return { error: "Numéro de téléphone invalide" };
  const linkRaw = text(fd, "linkUrl", 300);
  const linkUrl = linkRaw ? normalizeUrl(linkRaw) : null;
  if (linkRaw && !linkUrl) return { error: "Lien invalide (LinkedIn, site…)" };
  const values = {
    name, jobTitle: text(fd, "jobTitle", 120) || null, company: text(fd, "company", 120) || null,
    email: email || null, phone: phone || null, linkUrl, notes: text(fd, "notes", 2000) || null,
  };
  const id = Number(fd.get("id"));
  if (Number.isInteger(id) && id > 0) {
    await db.update(networkContacts).set(values).where(and(eq(networkContacts.id, id), eq(networkContacts.userId, user.id)));
  } else {
    const [{ n }] = await db.select({ n: count() }).from(networkContacts).where(eq(networkContacts.userId, user.id));
    if (n >= MAX_CONTACTS) return { error: `${MAX_CONTACTS} contacts maximum` };
    await db.insert(networkContacts).values({ userId: user.id, ...values });
  }
  revalidatePath("/reseau");
  return { ok: "Contact enregistré" };
}

export async function deleteNetworkContact(fd: FormData) {
  const user = await requireUser();
  await db.delete(networkContacts).where(and(eq(networkContacts.id, Number(fd.get("id"))), eq(networkContacts.userId, user.id)));
  revalidatePath("/reseau");
}

// ---------- Filières (administration) ----------

export async function saveTrack(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = text(fd, "name", 80);
  if (!name) return { error: "Le nom est obligatoire" };
  const order = Number(fd.get("sortOrder"));
  const sortOrder = Number.isInteger(order) ? Math.max(0, Math.min(999, order)) : 0;
  const id = Number(fd.get("id"));
  const [dup] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.name, name)).limit(1);
  if (dup && dup.id !== id) return { error: "Une filière porte déjà ce nom" };
  if (Number.isInteger(id) && id > 0) {
    await db.update(tracks).set({ name, sortOrder }).where(eq(tracks.id, id));
  } else {
    const last = await db.select({ o: tracks.sortOrder }).from(tracks).orderBy(asc(tracks.sortOrder));
    await db.insert(tracks).values({ name, sortOrder: fd.get("sortOrder") ? sortOrder : (last.at(-1)?.o ?? 0) + 1 });
  }
  revalidatePath("/admin/filieres");
  revalidatePath("/profil");
  revalidatePath("/annuaire");
  return { ok: "Filière enregistrée" };
}

export async function deleteTrack(fd: FormData) {
  await requireAdmin();
  await db.delete(tracks).where(eq(tracks.id, Number(fd.get("id")))); // les personnes concernées n'ont plus de filière (SET NULL)
  revalidatePath("/admin/filieres");
  revalidatePath("/profil");
  revalidatePath("/annuaire");
}
