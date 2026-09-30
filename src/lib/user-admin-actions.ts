"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { roles, sessions, users } from "@/db/schema";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { joinName } from "@/lib/names";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const refresh = () => revalidatePath("/admin", "layout");

/** Nombre d'administrateurs actifs, sans compter `exceptUserId`. Sert à ne jamais retirer le dernier. */
async function otherActiveAdmins(exceptUserId: number) {
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
    permAdministration: flag("permAdministration"),
    ...levels(fd),
  };
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
  status: z.enum(["active", "pending", "disabled"]),
});

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

  await db.update(users).set({
    firstName: p.data.firstName,
    lastName: p.data.lastName,
    name: joinName(p.data.firstName, p.data.lastName),
    email: p.data.email,
    roleId: roleId.data,
    status: p.data.status,
  }).where(eq(users.id, uid));
  // Compte désactivé : déconnecté partout, tout de suite.
  if (p.data.status === "disabled") await db.delete(sessions).where(eq(sessions.userId, uid));
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
  const [target] = await db.select({ roleId: users.roleId, status: users.status }).from(users).where(eq(users.id, uid)).limit(1);
  if (!target) return { error: "Personne introuvable" };
  const isAdminActive = target.status === "active" && (await db.select({ a: roles.isAdmin }).from(roles).where(eq(roles.id, target.roleId ?? 0)))[0]?.a;
  if (isAdminActive && (await otherActiveAdmins(uid)) === 0) return { error: "Il doit rester au moins un administrateur actif" };
  try {
    await db.delete(users).where(eq(users.id, uid));
  } catch {
    return { error: "Cette personne a créé du contenu (projets, cartes, articles, prêts…) : le supprimer le ferait disparaître. Désactive son compte à la place." };
  }
  refresh();
  redirect("/admin/utilisateurs"); // la page de la personne n'existe plus
}
