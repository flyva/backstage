"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { allow, clientIp } from "@/lib/rate-limit";
import { publicBaseUrl, sendMail } from "@/lib/mail";
import { renderMail } from "@/lib/mail-template";
import type { FormState } from "@/lib/actions";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const TTL_MS = 60 * 60 * 1000; // le lien est valable 1 heure

/**
 * Demande de nouveau mot de passe. La réponse est TOUJOURS la même (compte existant ou non) : on ne révèle pas
 * quelles adresses ont un compte. Si le compte existe, un lien à usage unique est envoyé par mail.
 */
export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const neutral: FormState = { ok: "Si un compte existe avec cette adresse, un mail avec un lien de réinitialisation vient d'être envoyé (valable 1 heure). Pense à regarder les courriers indésirables." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return { error: "Adresse e-mail invalide" };
  const ip = await clientIp();
  if (!allow(`reset:${ip}`, 8, 60 * 60e3) || !allow(`reset-mail:${email}`, 3, 60 * 60e3)) return { error: "Trop de demandes : réessaie dans une heure." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Pas de mail pour un compte inconnu, désactivé ou lié à Microsoft (sa connexion passe par Microsoft).
  if (!user || user.status === "disabled" || user.msOid) return neutral;

  const base = publicBaseUrl();
  if (!base) { console.error("[mot de passe oublié] APP_URL n'est pas défini : impossible de construire le lien."); return neutral; }

  const token = randomBytes(32).toString("hex");
  await db.delete(passwordResets).where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt))); // un seul lien valable à la fois
  await db.insert(passwordResets).values({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS) });

  const link = `${base}/reinitialiser?token=${token}`;
  const name = user.firstName || user.name;
  const text = `Bonjour ${name},\n\nTu as demandé à changer ton mot de passe Backstage. Ouvre ce lien (valable 1 heure) :\n${link}\n\nSi tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe ne change pas.\n`;
  const html = renderMail({ preview: "Choisis un nouveau mot de passe (lien valable 1 heure).", title: "Nouveau mot de passe", paragraphs: [`Bonjour ${name},`, "Tu as demandé à changer ton mot de passe Backstage. Clique sur le bouton pour en choisir un nouveau."], button: { label: "Choisir un nouveau mot de passe", url: link }, note: "Le lien est valable 1 heure. Si tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe ne change pas." });
  await sendMail(user.email, "Backstage : nouveau mot de passe", text, html);
  return neutral;
}

/** Enregistre le nouveau mot de passe avec le lien reçu par mail, puis ferme toutes les sessions de la personne. */
export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const pw = String(fd.get("password") ?? "");
  if (pw.length < 8) return { error: "8 caractères minimum" };
  if (pw.length > 200) return { error: "Mot de passe trop long" };
  if (pw !== String(fd.get("password2") ?? "")) return { error: "Les deux mots de passe ne correspondent pas" };
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: "Lien invalide ou expiré : refais une demande." };
  if (!allow(`reset-try:${await clientIp()}`, 20, 60 * 60e3)) return { error: "Trop d'essais : réessaie plus tard." };

  const [row] = await db.select().from(passwordResets).where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date()))).limit(1);
  if (!row) return { error: "Lien invalide ou expiré : refais une demande." };

  await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, row.id));
  await db.delete(sessions).where(eq(sessions.userId, row.userId)); // tous les appareils sont déconnectés
  redirect("/login?reinitialise=1");
}
