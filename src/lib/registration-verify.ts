"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { pendingRegistrations, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { newUserRoleId } from "@/lib/roles";
import { allow, clientIp } from "@/lib/rate-limit";
import { joinName } from "@/lib/names";
import { publicBaseUrl, sendMail } from "@/lib/mail";
import type { FormState } from "@/lib/actions";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const TTL_MS = 24 * 60 * 60 * 1000; // le lien est valable 24 heures
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Enregistre l'inscription en attente et envoie le lien de confirmation. Le compte n'existe qu'après le clic sur le lien. */
export async function startVerifiedRegistration(p: { email: string; firstName: string; lastName: string; passwordHash: string }): Promise<FormState> {
  const base = publicBaseUrl()!;
  const token = randomBytes(32).toString("hex");
  await db.delete(pendingRegistrations).where(lt(pendingRegistrations.expiresAt, new Date()));
  await db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, p.email)); // une seule demande en attente par adresse
  await db.insert(pendingRegistrations).values({ ...p, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS) });

  const link = `${base}/verifier?token=${token}`;
  const text = `Bonjour ${p.firstName},\n\nPour activer ton compte Backstage, ouvre ce lien (valable 24 heures) :\n${link}\n\nSi tu n'as pas créé de compte, ignore ce message.\n`;
  const html = `<p>Bonjour ${esc(p.firstName)},</p><p>Pour activer ton compte Backstage :</p><p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Activer mon compte</a></p><p style="color:#666;font-size:13px">Le lien est valable 24 heures. Si tu n'as pas créé de compte, ignore ce message.</p>`;
  const sent = await sendMail(p.email, "Backstage : active ton compte", text, html);
  if (!sent) {
    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, p.email));
    return { error: "Impossible d'envoyer le mail de confirmation pour le moment. Réessaie plus tard." };
  }
  return { ok: "Un mail de confirmation vient d'être envoyé : clique sur le lien pour activer ton compte (valable 24 heures). Pense à regarder les courriers indésirables." };
}

/** Crée le compte depuis le lien reçu par mail, puis ouvre la session. (Action déclenchée par un bouton : les scanners de liens des messageries ne peuvent pas la consommer.) */
export async function confirmRegistration(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: "Lien invalide ou expiré : refais l'inscription." };
  if (!allow(`verify-try:${await clientIp()}`, 20, 60 * 60e3)) return { error: "Trop d'essais : réessaie plus tard." };

  const [row] = await db.select().from(pendingRegistrations)
    .where(and(eq(pendingRegistrations.tokenHash, sha256(token)), gt(pendingRegistrations.expiresAt, new Date()))).limit(1);
  if (!row) return { error: "Lien invalide ou expiré : refais l'inscription." };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, row.email)).limit(1);
  if (existing) {
    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.id, row.id));
    return { error: "Un compte existe déjà avec cette adresse : connecte-toi." };
  }
  const [{ total }] = await db.select({ total: count() }).from(users).where(eq(users.status, "active"));
  const [res] = await db.insert(users).values({
    email: row.email, firstName: row.firstName, lastName: row.lastName, name: joinName(row.firstName, row.lastName),
    passwordHash: row.passwordHash, roleId: await newUserRoleId(total === 0),
  });
  await db.delete(pendingRegistrations).where(eq(pendingRegistrations.id, row.id));
  await createSession(res.insertId);
  redirect("/profil?bienvenue=1");
}
