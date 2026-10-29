"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendaViewers, passwordResets, roles, sessions, users } from "@/db/schema";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { joinName } from "@/lib/names";
import { COURSE_PAGES } from "@/lib/perms";
import { TOGGLEABLE_GROUPS } from "@/lib/nav-data";
import { logAdminAction } from "@/lib/audit";
import { randomBytes, createHash } from "node:crypto";
import { publicBaseUrl, sendMail } from "@/lib/mail";
import { renderMail } from "@/lib/mail-template";
import type { FormState } from "@/lib/actions";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const id = z.coerce.number().int().positive();
const refresh = () => revalidatePath("/admin", "layout");

/** Nombre d'administrateurs actifs, sans compter `exceptUserId`. Sert à ne jamais retirer le dernier. */
export async function otherActiveAdmins(exceptUserId: number) {
  const [r] = await db
    .select({ n: count() })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(roles.isAdmin, true), eq(users.status, "active"), ne(users.id, exceptUserId)));
  return Number(r?.n ?? 0);
}

// ---------- Rôles ----------

const roleSchema = z.object({
  name: z.string().trim().min(2, "Nom du rôle requis (2 caractères minimum)").max(60),
  description: z.string().trim().max(200),
});

/** Niveaux Aucun / Voir / Gérer de chaque domaine → colonnes « voir » et « gérer ». */
function levels(fd: FormData) {
  const lv = (name: string) => {
    const v = String(fd.get(name) ?? "view");
    return { view: v === "view" || v === "manage", manage: v === "manage" };
  };
  const m = lv("level_materiel"), b = lv("level_bde"), a = lv("level_actus"), g = lv("level_galerie");
  return {
    viewMateriel: m.view, permMateriel: m.manage,
    viewBde: b.view, permBde: b.manage,
    viewActus: a.view, permActus: a.manage,
    viewGalerie: g.view, permGalerie: g.manage,
  };
}

export async function saveRole(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = roleSchema.safeParse({ name: fd.get("name"), description: fd.get("description") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const flag = (k: string) => fd.get(k) === "on";
  const values = {
    name: p.data.name,
    description: p.data.description || null,
    isAdmin: flag("isAdmin"),
    isCompany: flag("isCompany"),
    permAdministration: flag("permAdministration"),
    permTickets: flag("permTickets"),
    viewSavoirs: fd.get("section_savoirs") !== "none",
    viewPromo: fd.get("section_promo") !== "none",
    viewVie: fd.get("section_vie") !== "none",
    viewDetente: fd.get("section_detente") !== "none",
    viewRechercheEntreprises: fd.get("section_rechercheEntreprises") !== "none",
    // null = tout visible, y compris les pages de Cours ajoutées plus tard ; une liste explicite ne fige que si quelque chose est vraiment décoché.
    courseTags: (() => {
      const kept = COURSE_PAGES.filter((c) => fd.get(`course_${c.key}`) !== "none").map((c) => c.key);
      return kept.length === COURSE_PAGES.length ? null : kept.join(",");
    })(),
    // null = rien de masqué, y compris les pages ajoutées plus tard ; une liste explicite ne fige que si quelque chose est vraiment décoché.
    hiddenPages: (() => {
      const all = TOGGLEABLE_GROUPS.flatMap((g) => g.pages);
      const hidden = all.filter((pg) => fd.get(`page_${pg.href}`) !== "on").map((pg) => pg.href);
      return hidden.length === 0 ? null : hidden.join(",");
    })(),
    ...levels(fd),
  };
  if (values.isAdmin) values.isCompany = false; // un administrateur n'est jamais un rôle externe en lecture seule
  const raw = Number(fd.get("id") || 0);
  const [dup] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, values.name)).limit(1);
  if (dup && dup.id !== raw) return { error: "Un rôle porte déjà ce nom" };

  if (raw) {
    const [cur] = await db.select().from(roles).where(eq(roles.id, raw)).limit(1);
    if (!cur) return { error: "Rôle introuvable" };
    // Le rôle « Administrateur » d'origine garde tous les droits : impossible de se retrouver sans administrateur.
    if (cur.key === "admin") { values.isAdmin = true; }
    else if (cur.isAdmin && !values.isAdmin && (await db.select({ n: count() }).from(users).where(eq(users.roleId, raw)))[0].n > 0) {
      // Retirer « administrateur » à un rôle utilisé : il faut qu'un autre administrateur actif reste.
      const [others] = await db.select({ n: count() }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).where(and(eq(roles.isAdmin, true), ne(roles.id, raw), eq(users.status, "active")));
      if (Number(others?.n ?? 0) === 0) return { error: "Il doit rester au moins un administrateur actif" };
    }
    await db.update(roles).set(values).where(eq(roles.id, raw));
  } else {
    await db.insert(roles).values(values);
  }
  refresh();
  return { ok: raw ? "Rôle enregistré" : "Rôle créé" };
}

export async function deleteRole(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const rid = id.parse(fd.get("id"));
  const [role] = await db.select().from(roles).where(eq(roles.id, rid)).limit(1);
  if (!role) return { error: "Rôle introuvable" };
  if (role.key === "admin" || role.key === "member") return { error: "Ce rôle d'origine ne peut pas être supprimé" };
  const [used] = await db.select({ n: count() }).from(users).where(eq(users.roleId, rid));
  if (Number(used.n) > 0) return { error: `Ce rôle est encore utilisé par ${used.n} personne(s) : change d'abord leur rôle` };
  await db.delete(roles).where(eq(roles.id, rid));
  refresh();
  return { ok: "Rôle supprimé" };
}

// ---------- Utilisateurs ----------

const userSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(60),
  lastName: z.string().trim().min(1, "Nom requis").max(60),
  email: z.string().trim().toLowerCase().email("Email invalide").max(190),
  status: z.enum(["active", "pending", "disabled", "rejected"]),
});

const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(60),
  lastName: z.string().trim().min(1, "Nom requis").max(60),
  email: z.string().trim().toLowerCase().email("Email invalide").max(190),
});

/**
 * Crée un compte natif (mot de passe, pas Google/Microsoft) directement depuis l'admin : pour les personnes sans
 * adresse 3iS ni Gmail (tuteur en entreprise, intervenant extérieur…).
 *
 * Deux façons de démarrer :
 * - « invite » (par défaut) : mot de passe de départ inutilisable, un lien pour en choisir un vrai part par mail
 *   (réutilise le mécanisme de « mot de passe oublié ») ; les CGU restent à accepter par la personne.
 * - « direct » : pas de mail, les identifiants (adresse + mot de passe choisi ici, ou généré) sont donnés tout de
 *   suite à l'admin pour les transmettre lui-même ; les CGU sont considérées acceptées (c'est l'admin qui crée le
 *   compte en connaissance de cause). La personne pourra changer son mot de passe depuis son profil.
 */
export async function createUser(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = createUserSchema.safeParse({ firstName: fd.get("firstName"), lastName: fd.get("lastName"), email: fd.get("email") });
  if (!p.success) return { error: p.error.issues[0].message };
  const roleId = id.safeParse(fd.get("roleId"));
  if (!roleId.success) return { error: "Choisis un rôle" };
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId.data)).limit(1);
  if (!role) return { error: "Rôle introuvable" };

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, p.data.email)).limit(1);
  if (taken) return { error: "Cette adresse est déjà utilisée par un autre compte" };

  const direct = fd.get("mode") === "direct";
  let password = "";
  if (direct) {
    password = String(fd.get("password") ?? "");
    if (password.length < 8) return { error: "Mot de passe : 8 caractères minimum" };
    if (password.length > 200) return { error: "Mot de passe trop long" };
  }

  // Alternants dont ce nouveau compte devient le référent : il pourra voir leur agenda, leur pointeuse et leurs stats en lecture seule.
  const tuteeIds = fd.getAll("tuteeIds").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);

  const name = joinName(p.data.firstName, p.data.lastName);
  const [res] = await db.insert(users).values({
    email: p.data.email,
    firstName: p.data.firstName,
    lastName: p.data.lastName,
    name,
    // Mode « invite » : inutilisable, remplacé via le lien envoyé par mail. Mode « direct » : celui choisi ici.
    passwordHash: await hashPassword(direct ? password : randomBytes(32).toString("hex")),
    roleId: roleId.data,
    status: "active",
    cguAcceptedAt: direct ? new Date() : null,
  });
  const newId = res.insertId;

  if (tuteeIds.length) await db.insert(agendaViewers).values(tuteeIds.map((ownerUserId) => ({ ownerUserId, viewerUserId: newId })));

  if (direct) {
    await logAdminAction(admin.id, "create", newId, name);
    refresh();
    return { ok: `Compte créé. Identifiant : ${p.data.email} · Mot de passe : ${password} (donne-les à la personne ; elle pourra changer son mot de passe dans son profil).` };
  }

  const base = publicBaseUrl();
  if (base) {
    const token = randomBytes(32).toString("hex");
    await db.insert(passwordResets).values({ userId: newId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 864e5) });
    const link = `${base}/reinitialiser?token=${token}`;
    const text = `Bonjour ${p.data.firstName || name},\n\nUn compte Backstage vient d'être créé pour toi (${name}). Ouvre ce lien (valable 7 jours) pour choisir ton mot de passe et accéder à l'application :\n${link}\n`;
    const html = renderMail({ preview: "Choisis ton mot de passe pour activer ton compte Backstage.", title: "Ton compte Backstage", paragraphs: [`Bonjour ${p.data.firstName || name},`, "Un compte Backstage vient d'être créé pour toi. Clique sur le bouton pour choisir ton mot de passe et y accéder."], button: { label: "Choisir mon mot de passe", url: link }, note: "Le lien est valable 7 jours." });
    await sendMail(p.data.email, "Ton compte Backstage", text, html);
  }

  await logAdminAction(admin.id, "create", newId, name);
  refresh();
  return { ok: base ? "Compte créé : un mail avec un lien d'activation vient d'être envoyé." : "Compte créé (APP_URL non configuré : aucun mail envoyé, communique le mot de passe via « Réinitialiser »)." };
}

export async function updateUser(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const uid = id.parse(fd.get("id"));
  const p = userSchema.safeParse({ firstName: fd.get("firstName"), lastName: fd.get("lastName"), email: fd.get("email"), status: fd.get("status") });
  if (!p.success) return { error: p.error.issues[0].message };
  const roleId = id.safeParse(fd.get("roleId"));
  if (!roleId.success) return { error: "Choisis un rôle" };

  const [target] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!target) return { error: "Personne introuvable" };
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId.data)).limit(1);
  if (!role) return { error: "Rôle introuvable" };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, p.data.email)).limit(1);
  if (taken && taken.id !== uid) return { error: "Cette adresse est déjà utilisée par un autre compte" };

  // Pas de blocage par erreur : on ne change ni son propre rôle, ni son propre statut.
  if (uid === admin.id && (roleId.data !== target.roleId || p.data.status !== target.status)) return { error: "Tu ne peux pas changer ton propre rôle ni ton propre statut" };
  // Le dernier administrateur actif ne perd ni son droit, ni son accès.
  const wasAdminActive = target.status === "active" && (await db.select({ a: roles.isAdmin }).from(roles).where(eq(roles.id, target.roleId ?? 0)))[0]?.a;
  const willBeAdminActive = p.data.status === "active" && role.isAdmin;
  if (wasAdminActive && !willBeAdminActive && (await otherActiveAdmins(uid)) === 0) return { error: "Il doit rester au moins un administrateur actif" };

  // Compte Google/Microsoft : l'adresse vient du fournisseur, elle ne se modifie pas depuis Backstage (même par un admin).
  const ssoLinked = !!target.googleSub || !!target.msOid;
  await db.update(users).set({
    firstName: p.data.firstName,
    lastName: p.data.lastName,
    name: joinName(p.data.firstName, p.data.lastName),
    email: ssoLinked ? target.email : p.data.email,
    roleId: roleId.data,
    status: p.data.status,
  }).where(eq(users.id, uid));
  // Compte désactivé : déconnecté partout, tout de suite.
  if (p.data.status === "disabled") await db.delete(sessions).where(eq(sessions.userId, uid));
  const changes = [role.id !== target.roleId && `rôle → ${role.name}`, p.data.status !== target.status && `statut → ${p.data.status}`].filter(Boolean).join(", ");
  if (changes) await logAdminAction(admin.id, "update", uid, `${target.name} : ${changes}`);
  refresh();
  return { ok: "Personne enregistrée" };
}

/** Définit un nouveau mot de passe (à communiquer à la personne) ; ses sessions en cours sont fermées. */
export async function resetUserPassword(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const uid = id.parse(fd.get("id"));
  const pw = String(fd.get("password") ?? "");
  if (pw.length < 8) return { error: "8 caractères minimum" };
  if (pw.length > 200) return { error: "Mot de passe trop long" };
  await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.id, uid));
  await db.delete(sessions).where(eq(sessions.userId, uid));
  return { ok: "Mot de passe changé. Ses appareils connectés ont été déconnectés." };
}

/** Suppression définitive. Refusée si la personne a créé du contenu (projets, cartes, articles…) : on propose alors de désactiver le compte. */
export async function deleteUser(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const uid = id.parse(fd.get("id"));
  if (uid === admin.id) return { error: "Tu ne peux pas supprimer ton propre compte" };
  const [target] = await db.select({ name: users.name, roleId: users.roleId, status: users.status }).from(users).where(eq(users.id, uid)).limit(1);
  if (!target) return { error: "Personne introuvable" };
  const isAdminActive = target.status === "active" && (await db.select({ a: roles.isAdmin }).from(roles).where(eq(roles.id, target.roleId ?? 0)))[0]?.a;
  if (isAdminActive && (await otherActiveAdmins(uid)) === 0) return { error: "Il doit rester au moins un administrateur actif" };
  try {
    await db.delete(users).where(eq(users.id, uid));
  } catch {
    return { error: "Cette personne a créé du contenu (projets, cartes, articles, prêts…) : le supprimer le ferait disparaître. Désactive son compte à la place, ou anonymise-la." };
  }
  await logAdminAction(admin.id, "delete", null, target.name);
  refresh();
  redirect("/admin/utilisateurs"); // la page de la personne n'existe plus
}

/**
 * Anonymise un compte qui ne peut pas être supprimé (contenu partagé lié) : nom, coordonnées et profil remplacés,
 * compte désactivé et déconnecté. Ses messages/avis restent en base mais ne pointent plus vers une personne
 * identifiable. Irréversible (les informations d'origine ne sont pas conservées ailleurs).
 */
export async function anonymizeUser(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const uid = id.parse(fd.get("id"));
  if (uid === admin.id) return { error: "Tu ne peux pas anonymiser ton propre compte" };
  const [target] = await db.select({ name: users.name, roleId: users.roleId, status: users.status }).from(users).where(eq(users.id, uid)).limit(1);
  if (!target) return { error: "Personne introuvable" };
  const isAdminActive = target.status === "active" && (await db.select({ a: roles.isAdmin }).from(roles).where(eq(roles.id, target.roleId ?? 0)))[0]?.a;
  if (isAdminActive && (await otherActiveAdmins(uid)) === 0) return { error: "Il doit rester au moins un administrateur actif" };

  const placeholder = `supprime-${uid}-${randomBytes(4).toString("hex")}@anonymise.local`;
  await db.update(users).set({
    firstName: "", lastName: "", name: "Personne supprimée", email: placeholder, status: "disabled",
    passwordHash: await hashPassword(randomBytes(32).toString("hex")), googleSub: null, msOid: null,
    phone: null, companyName: null, companyAddress: null, companyLat: null, companyLng: null,
    homeAddress: null, homeLat: null, homeLng: null, avatarFile: null, headline: null, contactEmail: null,
    discord: null, habilitation: null, trackId: null, classId: null, cardEnabled: false, cardSlug: null,
    icalUrl: null, feedToken: null,
  }).where(eq(users.id, uid));
  await db.delete(agendaViewers).where(or(eq(agendaViewers.ownerUserId, uid), eq(agendaViewers.viewerUserId, uid)));
  await db.delete(sessions).where(eq(sessions.userId, uid));
  await logAdminAction(admin.id, "anonymize", uid, target.name);
  refresh();
  redirect("/admin/utilisateurs");
}
