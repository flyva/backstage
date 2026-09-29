import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { skinFrom } from "@/lib/skin";
import { writeSkinCookies } from "@/lib/skin-cookies";

// Connexion « Se connecter avec Microsoft » (OpenID Connect, flux code + PKCE) pour les comptes Office 365.
//
// Variables d'environnement :
//   MS_CLIENT_ID         identifiant de l'application (Entra ID)
//   MS_CLIENT_SECRET     secret de l'application
//   MS_ALLOWED_TENANTS   identifiant(s) d'organisation autorisé(s), séparés par des virgules (celui de l'école)
//   APP_URL              adresse publique du site (https://backstage.exemple.fr) : sert à l'URL de retour
//   MS_AUTHORITY_URL     (facultatif) https://login.microsoftonline.com par défaut

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function microsoftConfig() {
  const clientId = process.env.MS_CLIENT_ID?.trim();
  const clientSecret = process.env.MS_CLIENT_SECRET?.trim();
  const tenants = (process.env.MS_ALLOWED_TENANTS ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  // Sans liste d'organisations autorisées, n'importe quel compte Microsoft pourrait entrer : on désactive plutôt que d'ouvrir grand.
  if (!clientId || !clientSecret || tenants.length === 0 || !tenants.every((t) => GUID.test(t))) return null;
  const authority = (process.env.MS_AUTHORITY_URL ?? "https://login.microsoftonline.com").replace(/\/+$/, "");
  // Le jeton d'identité est reçu directement de Microsoft en HTTPS : on refuse tout autre transport en production.
  if (process.env.NODE_ENV === "production" && !authority.startsWith("https://")) return null;
  // Application propre à une organisation : on l'appelle sur son adresse ; sinon « organizations » (comptes pro/scolaires).
  const endpointTenant = tenants.length === 1 ? tenants[0] : "organizations";
  return { clientId, clientSecret, tenants, authority, endpointTenant };
}

export const microsoftEnabled = () => microsoftConfig() !== null;

/** Adresse publique du site. En production, APP_URL est obligatoire (l'en-tête Host ne doit pas décider d'une URL de retour). */
export function appBaseUrl(req: Request): string | null {
  const fixed = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  if (process.env.NODE_ENV === "production") return null;
  return new URL(req.url).origin;
}

export const redirectUri = (base: string) => `${base}/api/auth/microsoft/callback`;

// ---------- PKCE ----------

export const b64url = (buf: Buffer) => buf.toString("base64url");
export const newSecret = (bytes = 32) => b64url(randomBytes(bytes));
export const challengeFor = (verifier: string) => b64url(createHash("sha256").update(verifier).digest());

export function authorizeUrl(cfg: NonNullable<ReturnType<typeof microsoftConfig>>, base: string, s: { state: string; nonce: string; verifier: string }) {
  const q = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: redirectUri(base),
    response_mode: "query",
    scope: "openid profile email",
    state: s.state,
    nonce: s.nonce,
    code_challenge: challengeFor(s.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${cfg.authority}/${cfg.endpointTenant}/oauth2/v2.0/authorize?${q}`;
}

// ---------- jeton d'identité ----------

export type Claims = { iss?: string; aud?: string; exp?: number; nonce?: string; tid?: string; oid?: string; sub?: string; name?: string; email?: string; preferred_username?: string };

export function decodeIdToken(idToken: string): Claims | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Claims;
  } catch {
    return null;
  }
}

export type Identity = { key: string; email: string; name: string };

/**
 * Vérifie les revendications du jeton. La signature n'est pas revérifiée : le jeton vient directement du point
 * d'accès de Microsoft (HTTPS + secret de l'application), comme le prévoit OpenID Connect pour ce flux.
 */
export function validateClaims(c: Claims, cfg: NonNullable<ReturnType<typeof microsoftConfig>>, nonce: string): { ok: true; identity: Identity } | { ok: false; reason: string } {
  if (c.aud !== cfg.clientId) return { ok: false, reason: "Jeton destiné à une autre application" };
  if (!c.exp || c.exp * 1000 < Date.now()) return { ok: false, reason: "Jeton expiré" };
  if (!c.nonce || c.nonce !== nonce) return { ok: false, reason: "Jeton rejoué ou invalide" };
  const tid = c.tid?.toLowerCase();
  if (!tid || !cfg.tenants.includes(tid)) return { ok: false, reason: "Ton organisation n'est pas autorisée à utiliser Backstage" };
  if (c.iss && !c.iss.endsWith(`/${tid}/v2.0`)) return { ok: false, reason: "Émetteur du jeton inattendu" };
  const oid = c.oid ?? c.sub;
  const email = (c.email ?? c.preferred_username ?? "").trim().toLowerCase();
  if (!oid || !email.includes("@")) return { ok: false, reason: "Le compte Microsoft ne fournit pas d'adresse email" };
  const name = (c.name ?? email.split("@")[0]).trim().slice(0, 120) || email;
  return { ok: true, identity: { key: `${tid}.${oid}`.slice(0, 80), email: email.slice(0, 190), name } };
}

// ---------- compte local ----------

/**
 * Retrouve ou crée le compte lié à l'identité Microsoft, puis ouvre la session.
 * - déjà lié : connexion directe ;
 * - un compte local existe avec cet email (jamais lié) : il est lié à Microsoft et ses anciens identifiants sont
 *   révoqués (mot de passe rendu inutilisable, sessions fermées) : c'est le titulaire réel de l'adresse qui reprend
 *   la main, et personne d'autre ne peut avoir « réservé » l'adresse d'un tiers ;
 * - sinon : nouveau compte (le tout premier compte de l'application devient administrateur).
 */
export async function signInWithMicrosoft(identity: Identity): Promise<{ user: User; created: boolean }> {
  const [linked] = await db.select().from(users).where(eq(users.msOid, identity.key)).limit(1);
  if (linked) {
    await createSession(linked.id);
    await writeSkinCookies(skinFrom(linked));
    return { user: linked, created: false };
  }

  const [existing] = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
  if (existing) {
    const unusable = await hashPassword(newSecret(48));
    // Le nom vient désormais de Microsoft (celui saisi à l'inscription locale n'était pas vérifié).
    await db.update(users).set({ msOid: identity.key, passwordHash: unusable, name: identity.name }).where(eq(users.id, existing.id));
    await db.delete(sessions).where(eq(sessions.userId, existing.id));
    await createSession(existing.id);
    await writeSkinCookies(skinFrom(existing));
    return { user: { ...existing, msOid: identity.key, name: identity.name }, created: false };
  }

  const [{ total }] = await db.select({ total: count() }).from(users);
  const [res] = await db.insert(users).values({
    email: identity.email,
    name: identity.name,
    passwordHash: await hashPassword(newSecret(48)), // pas de mot de passe local : la connexion passe par Microsoft
    role: total === 0 ? "admin" : "member",
    msOid: identity.key,
  });
  const [created] = await db.select().from(users).where(eq(users.id, res.insertId)).limit(1);
  await createSession(created.id);
  await writeSkinCookies(skinFrom(created));
  return { user: created, created: true };
}
