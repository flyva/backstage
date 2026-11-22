"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { LINK_KINDS, classes, domaines, networkContacts, pendingEmailVerifications, roles, trackReferents, tracks, userFormations, userLinks, users, type LinkKind } from "@/db/schema";
import { destroySession, requireAdmin, requireUser } from "@/lib/auth";
import { AVATAR_NAME, MAX_AVATAR_BYTES, avatarDir, ensureAvatarDir, newAvatarName, sniffAvatar } from "@/lib/avatar-files";
import { HABILITATION_SYMBOLS, PHONE_RE, normalizeDiscord, normalizeUrl } from "@/lib/people-shared";
import { allowedDomainsFromEnv, emailInDomains } from "@/lib/email-domain";
import { allow } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { renderMail } from "@/lib/mail-template";
import { otherActiveAdmins } from "@/lib/user-admin-actions";
import type { FormState } from "@/lib/actions";

const MAX_LINKS = 12;
const MAX_CONTACTS = 500;
const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

// ---------- Profil d'un compte « Entreprise » (lecture seule) : juste son nom, l'entreprise et le poste, rien du
// reste du profil (filière, classe, annuaire, carte de visite, réseaux…) qui ne le concerne pas. ----------

export async function saveCompanyProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const firstName = text(fd, "firstName", 60);
  const lastName = text(fd, "lastName", 60);
  if (!firstName || !lastName) return { error: "Prénom et nom requis" };
  const companyName = text(fd, "companyName", 120);
  const headline = text(fd, "headline", 120);
  await db.update(users).set({
    firstName, lastName, name: `${firstName} ${lastName}`.trim(),
    companyName: companyName || null, headline: headline || null,
  }).where(eq(users.id, user.id));
  revalidatePath("/profil");
  return { ok: "Profil enregistré" };
}

// ---------- Fiche personnelle (annuaire de la promo) ----------

export async function saveAnnuaire(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const trackRaw = Number(fd.get("trackId"));
  let trackId: number | null = null;
  if (Number.isInteger(trackRaw) && trackRaw > 0) {
    const [t] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, trackRaw)).limit(1);
    if (!t) return { error: "Filière inconnue" };
    trackId = t.id;
  }
  const classRaw = Number(fd.get("classId"));
  let classId: number | null = null;
  if (Number.isInteger(classRaw) && classRaw > 0) {
    const [c] = await db.select({ id: classes.id }).from(classes).where(eq(classes.id, classRaw)).limit(1);
    if (!c) return { error: "Classe inconnue" };
    classId = c.id;
  }
  const headline = text(fd, "headline", 120);
  const phone = text(fd, "phone", 30);
  if (phone && !PHONE_RE.test(phone)) return { error: "Numéro de téléphone invalide (chiffres, espaces, + . - ( ) uniquement)" };
  const discordRaw = text(fd, "discord", 40);
  const discord = discordRaw ? normalizeDiscord(discordRaw) : null;
  if (discordRaw && !discord) return { error: "Pseudo Discord invalide (lettres, chiffres, « . », « _ » ou « - », sans espace)" };
  const contactEmail = text(fd, "contactEmail", 190).toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { error: "Adresse e-mail de contact invalide" };
  const habilitationRaw = text(fd, "habilitation", 12);
  const habilitation = (HABILITATION_SYMBOLS as readonly string[]).includes(habilitationRaw) ? habilitationRaw : null;
  await db.update(users).set({
    trackId, classId, headline: headline || null, phone: phone || null, contactEmail: contactEmail || null,
    showInDirectory: fd.get("showInDirectory") === "on", showPhone: fd.get("showPhone") === "on",
    discord, showCompany: fd.get("showCompany") === "on",
    habilitation,
  }).where(eq(users.id, user.id));
  revalidatePath("/profil");
  revalidatePath("/annuaire");
  return { ok: "Fiche enregistrée" };
}

// ---------- Carte de visite : ce qu'elle affiche (en plus d'activée/désactivée, voir setCardEnabled) ----------

export async function saveCardVisibility(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  await db.update(users).set({
    cardShowPhone: fd.get("cardShowPhone") === "on",
    cardShowDiscord: fd.get("cardShowDiscord") === "on",
    cardShowSchool: fd.get("cardShowSchool") === "on",
  }).where(eq(users.id, user.id));
  revalidatePath("/profil");
  return { ok: "Carte de visite enregistrée" };
}

// ---------- Statut étudiant (alternant / initial) : change le libellé Alternance/Stage dans le menu et le profil ----------

// ---------- Mes formations (tags « RT1 », « ACTING2 »… qui s'accumulent au fil du cursus) ----------

export async function addUserFormation(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const trackId = Number(fd.get("trackId"));
  const year = Number(fd.get("year"));
  if (!trackId || !year || year < 1 || year > 10) return { error: "Choisis une formation et une année" };
  const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
  if (!track) return { error: "Formation introuvable" };
  if (year > track.yearsCount) return { error: `${track.name} ne compte que ${track.yearsCount} année(s)` };
  const existing = await db.select({ id: userFormations.id }).from(userFormations)
    .where(and(eq(userFormations.userId, user.id), eq(userFormations.trackId, trackId), eq(userFormations.year, year)));
  if (existing.length === 0) {
    await db.insert(userFormations).values({ userId: user.id, trackId, year });
  }
  revalidatePath("/profil");
  return { ok: "Formation ajoutée" };
}

export async function setPromotion(fd: FormData) {
  const user = await requireUser();
  const classRaw = Number(fd.get("classId"));
  let classId: number | null = null;
  if (Number.isInteger(classRaw) && classRaw > 0) {
    const [c] = await db.select({ id: classes.id }).from(classes).where(eq(classes.id, classRaw)).limit(1);
    if (!c) return;
    classId = c.id;
  }
  await db.update(users).set({ classId }).where(eq(users.id, user.id));
  revalidatePath("/profil");
  revalidatePath("/annuaire");
}

export async function removeUserFormation(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  await db.delete(userFormations).where(and(eq(userFormations.id, id), eq(userFormations.userId, user.id)));
  revalidatePath("/profil");
}

// ---------- Ajout d'une adresse 3IS vérifiée (pour qui s'est connecté avec un Gmail personnel) ----------

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const CODE_TTL_MS = 15 * 60 * 1000;

export async function requestInstitutionalEmail(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const email = text(fd, "email", 190).toLowerCase();
  const domains = allowedDomainsFromEnv();
  if (!email || !emailInDomains(email, domains)) return { error: domains.length ? `L'adresse doit se terminer par @${domains[0]}` : "Adresse invalide" };
  if (!allow(`inst-email:${user.id}`, 5, 60 * 60e3)) return { error: "Trop de demandes : réessaie plus tard." };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const [taken2] = await db.select({ id: users.id }).from(users).where(eq(users.institutionalEmail, email)).limit(1);
  if (taken || taken2) return { error: "Cette adresse est déjà utilisée par un autre compte." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.delete(pendingEmailVerifications).where(eq(pendingEmailVerifications.userId, user.id));
  await db.insert(pendingEmailVerifications).values({ userId: user.id, email, codeHash: sha256(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) });

  const text_ = `Bonjour,\n\nVoici ton code pour vérifier ton adresse 3IS sur Backstage : ${code}\n\nIl est valable 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore ce message.\n`;
  const html = renderMail({ preview: "Ton code de vérification pour ajouter ton adresse 3IS.", title: "Vérifie ton adresse 3IS", paragraphs: ["Voici ton code pour vérifier ton adresse 3IS sur Backstage :"], quote: code, note: "Ce code est valable 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore ce message." });
  const sent = await sendMail(email, "Backstage : code de vérification", text_, html);
  if (!sent) {
    await db.delete(pendingEmailVerifications).where(eq(pendingEmailVerifications.userId, user.id));
    return { error: "Impossible d'envoyer le code pour le moment. Réessaie plus tard." };
  }
  return { ok: "Un code vient d'être envoyé à cette adresse : saisis-le ci-dessous (valable 15 minutes)." };
}

export async function confirmInstitutionalEmail(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const code = text(fd, "code", 6);
  if (!/^\d{6}$/.test(code)) return { error: "Code invalide" };
  const [pending] = await db.select().from(pendingEmailVerifications).where(eq(pendingEmailVerifications.userId, user.id));
  if (!pending || pending.expiresAt < new Date()) return { error: "Code expiré : redemande un code." };
  if (pending.attempts >= 5) return { error: "Trop d'essais : redemande un code." };
  if (sha256(code) !== pending.codeHash) {
    await db.update(pendingEmailVerifications).set({ attempts: pending.attempts + 1 }).where(eq(pendingEmailVerifications.userId, user.id));
    return { error: "Code incorrect" };
  }
  await db.update(users).set({ institutionalEmail: pending.email }).where(eq(users.id, user.id));
  await db.delete(pendingEmailVerifications).where(eq(pendingEmailVerifications.userId, user.id));
  revalidatePath("/profil");
  return { ok: "Adresse 3IS vérifiée et enregistrée." };
}

export async function setStudentStatus(fd: FormData) {
  const user = await requireUser();
  const value = fd.get("studentStatus");
  if (value !== "initial" && value !== "alternant") return;
  await db.update(users).set({ studentStatus: value }).where(eq(users.id, user.id));
  revalidatePath("/profil");
  revalidatePath("/", "layout");
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
  const shortName = text(fd, "shortName", 20);
  const order = Number(fd.get("sortOrder"));
  const sortOrder = Number.isInteger(order) ? Math.max(0, Math.min(999, order)) : 0;
  const domaineRaw = Number(fd.get("domaineId"));
  const domaineId = Number.isInteger(domaineRaw) && domaineRaw > 0 ? domaineRaw : null;
  const yearsRaw = Number(fd.get("yearsCount"));
  const yearsCount = Number.isInteger(yearsRaw) && yearsRaw >= 1 && yearsRaw <= 10 ? yearsRaw : 1;
  const id = Number(fd.get("id"));
  const [dup] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.name, name)).limit(1);
  if (dup && dup.id !== id) return { error: "Une formation porte déjà ce nom" };
  if (Number.isInteger(id) && id > 0) {
    await db.update(tracks).set({ name, shortName: shortName || null, domaineId, yearsCount, sortOrder }).where(eq(tracks.id, id));
  } else {
    const last = await db.select({ o: tracks.sortOrder }).from(tracks).orderBy(asc(tracks.sortOrder));
    await db.insert(tracks).values({ name, shortName: shortName || null, domaineId, yearsCount, sortOrder: fd.get("sortOrder") ? sortOrder : (last.at(-1)?.o ?? 0) + 1 });
  }
  revalidatePath("/admin/3is/formations");
  revalidatePath("/profil");
  revalidatePath("/annuaire");
  return { ok: "Formation enregistrée" };
}

export async function deleteTrack(fd: FormData) {
  await requireAdmin();
  await db.delete(tracks).where(eq(tracks.id, Number(fd.get("id")))); // les personnes concernées n'ont plus de formation (SET NULL)
  revalidatePath("/admin/3is/formations");
  revalidatePath("/profil");
  revalidatePath("/annuaire");
}

// ---------- Domaines (administration) ----------

export async function saveDomaine(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = text(fd, "name", 80);
  if (!name) return { error: "Le nom est obligatoire" };
  const order = Number(fd.get("sortOrder"));
  const sortOrder = Number.isInteger(order) ? Math.max(0, Math.min(999, order)) : 0;
  const id = Number(fd.get("id"));
  const [dup] = await db.select({ id: domaines.id }).from(domaines).where(eq(domaines.name, name)).limit(1);
  if (dup && dup.id !== id) return { error: "Un domaine porte déjà ce nom" };
  if (Number.isInteger(id) && id > 0) {
    await db.update(domaines).set({ name, sortOrder }).where(eq(domaines.id, id));
  } else {
    const last = await db.select({ o: domaines.sortOrder }).from(domaines).orderBy(asc(domaines.sortOrder));
    await db.insert(domaines).values({ name, sortOrder: fd.get("sortOrder") ? sortOrder : (last.at(-1)?.o ?? 0) + 1 });
  }
  revalidatePath("/admin/3is/domaines");
  revalidatePath("/admin/3is/formations");
  return { ok: "Domaine enregistré" };
}

export async function deleteDomaine(fd: FormData) {
  await requireAdmin();
  await db.delete(domaines).where(eq(domaines.id, Number(fd.get("id")))); // les formations concernées n'ont plus de domaine (SET NULL)
  revalidatePath("/admin/3is/domaines");
  revalidatePath("/admin/3is/formations");
}

// ---------- Promotions (administration) ----------

export async function saveClass(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = text(fd, "name", 80);
  if (!name) return { error: "Le nom est obligatoire" };
  const order = Number(fd.get("sortOrder"));
  const sortOrder = Number.isInteger(order) ? Math.max(0, Math.min(999, order)) : 0;
  const startRaw = Number(fd.get("startYear"));
  const endRaw = Number(fd.get("endYear"));
  const startYear = Number.isInteger(startRaw) && startRaw >= 2000 && startRaw <= 2100 ? startRaw : null;
  const endYear = Number.isInteger(endRaw) && endRaw >= 2000 && endRaw <= 2100 ? endRaw : null;
  const id = Number(fd.get("id"));
  const [dup] = await db.select({ id: classes.id }).from(classes).where(eq(classes.name, name)).limit(1);
  if (dup && dup.id !== id) return { error: "Une promotion porte déjà ce nom" };
  if (Number.isInteger(id) && id > 0) {
    await db.update(classes).set({ name, startYear, endYear, sortOrder }).where(eq(classes.id, id));
  } else {
    const last = await db.select({ o: classes.sortOrder }).from(classes).orderBy(asc(classes.sortOrder));
    await db.insert(classes).values({ name, startYear, endYear, sortOrder: fd.get("sortOrder") ? sortOrder : (last.at(-1)?.o ?? 0) + 1 });
  }
  revalidatePath("/admin/3is/promotions");
  revalidatePath("/profil");
  revalidatePath("/annuaire");
  return { ok: "Promotion enregistrée" };
}

export async function deleteClass(fd: FormData) {
  await requireAdmin();
  await db.delete(classes).where(eq(classes.id, Number(fd.get("id")))); // les personnes concernées n'ont plus de promotion (SET NULL)
  revalidatePath("/admin/3is/promotions");
  revalidatePath("/profil");
  revalidatePath("/annuaire");
}

// ---------- Référents de filière (administration) ----------

export async function addTrackReferent(fd: FormData) {
  await requireAdmin();
  const userId = Number(fd.get("userId"));
  const trackId = Number(fd.get("trackId"));
  if (!userId || !trackId) return;
  const [existing] = await db.select().from(trackReferents).where(and(eq(trackReferents.userId, userId), eq(trackReferents.trackId, trackId)));
  if (!existing) await db.insert(trackReferents).values({ userId, trackId });
  revalidatePath("/admin/3is/referents");
}

export async function addTrackReferentsBulk(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = Number(fd.get("userId"));
  const trackIds = fd.getAll("trackIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!userId || trackIds.length === 0) return { error: "Choisis une personne et au moins une formation" };
  const existing = await db.select().from(trackReferents).where(eq(trackReferents.userId, userId));
  const have = new Set(existing.map((e) => e.trackId));
  const toAdd = trackIds.filter((id) => !have.has(id));
  if (toAdd.length > 0) await db.insert(trackReferents).values(toAdd.map((trackId) => ({ userId, trackId })));
  revalidatePath("/admin/3is/referents");
  return { ok: "Référent enregistré" };
}

export async function removeTrackReferent(fd: FormData) {
  await requireAdmin();
  const userId = Number(fd.get("userId"));
  const trackId = Number(fd.get("trackId"));
  await db.delete(trackReferents).where(and(eq(trackReferents.userId, userId), eq(trackReferents.trackId, trackId)));
  revalidatePath("/admin/3is/referents");
}

// ---------- Abonnement calendrier (iCal) ----------

const newFeedToken = () => randomBytes(16).toString("hex"); // 32 caractères

export async function setFeedEnabled(fd: FormData) {
  const user = await requireUser();
  await db.update(users).set({ feedToken: fd.get("enabled") === "1" ? (user.feedToken ?? newFeedToken()) : null }).where(eq(users.id, user.id));
  revalidatePath("/profil");
}

/** Nouvelle adresse : l'ancienne cesse de fonctionner (à refaire dans l'application de calendrier). */
export async function regenerateFeedToken() {
  const user = await requireUser();
  await db.update(users).set({ feedToken: newFeedToken() }).where(eq(users.id, user.id));
  revalidatePath("/profil");
}

// ---------- Suppression de compte (RGPD, en libre-service) ----------

/**
 * Supprime son propre compte. Retape son adresse (plutôt que le mot de passe, inutilisable pour un compte
 * Google/Microsoft) pour confirmer. Bloqué si la personne a créé du contenu partagé (mêmes contraintes que la
 * suppression par un admin) : désactiver son compte via un admin reste la seule option dans ce cas.
 */
export async function deleteMyAccount(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const typed = String(fd.get("confirmEmail") ?? "").trim().toLowerCase();
  if (typed !== user.email.toLowerCase()) return { error: "L'adresse saisie ne correspond pas à ton compte" };
  const [role] = user.roleId ? await db.select({ isAdmin: roles.isAdmin }).from(roles).where(eq(roles.id, user.roleId)).limit(1) : [];
  if (role?.isAdmin && (await otherActiveAdmins(user.id)) === 0) {
    return { error: "Tu es le seul administrateur actif : désigne quelqu'un d'autre comme administrateur avant de supprimer ton compte." };
  }
  try {
    await db.delete(users).where(eq(users.id, user.id));
  } catch {
    return { error: "Impossible : tu as créé du contenu partagé (projets, annonces, articles, prêts…) qui disparaîtrait avec ton compte. Demande à un administrateur de désactiver ton compte à la place." };
  }
  await destroySession();
  redirect("/login?compte-supprime=1");
}
