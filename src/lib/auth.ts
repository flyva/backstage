import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, sessions, users, type User } from "@/db/schema";
import { permsOf, type Module, type Perms } from "@/lib/perms";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "session";
const SESSION_DAYS = 30;

// scrypt (natif Node) : pas de dépendance native, donc compatible Pi 32 bits.
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Personne connectée : ses infos, son rôle et ses droits. */
export type SessionUser = User & { perms: Perms; roleName: string };

export async function createSession(userId: number) {
  // Un compte désactivé ne peut plus ouvrir de session (aucune connexion possible, même via Google ou Microsoft).
  const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.status === "disabled") return;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

/** Déconnecte tous les appareils de la personne sauf la session courante (après un changement de mot de passe). */
export async function destroyOtherSessions(userId: number) {
  const token = (await cookies()).get(COOKIE)?.value;
  const keep = token ? sha256(token) : null;
  const all = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
  for (const s of all) if (s.id !== keep) await db.delete(sessions).where(eq(sessions.id, s.id));
}

/** Personne connectée, quel que soit son statut (y compris « en attente de validation »). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users, role: roles, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(roles, eq(roles.id, users.roleId))
    .where(eq(sessions.id, sha256(token)))
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt < new Date() || row.user.status === "disabled") return null;
  return { ...row.user, perms: permsOf(row.role), roleName: row.role?.name ?? "Membre" };
});

/**
 * Personne connectée ET validée. Un compte « en attente » (Google personnel) n'a accès à rien : ni pages, ni fichiers,
 * ni API (getUser renvoie null pour lui, donc toutes les routes le traitent comme non connecté).
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const user = await getSessionUser();
  return user && user.status === "active" ? user : null;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "active") redirect("/en-attente");
  return user;
}

/** Personne connectée qui a au moins le niveau « Voir » sur ce domaine (sinon retour à l'accueil). */
export async function requireModule(module: Module) {
  const user = await requireUser();
  if (!user.perms.view[module]) redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.perms.administration) redirect("/");
  return user;
}
