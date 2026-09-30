import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { newUserRoleId } from "@/lib/roles";
import { allowedDomainsFromEnv, emailInDomains } from "@/lib/email-domain";
import { challengeFor, newSecret } from "@/lib/microsoft";
import { joinName, splitName } from "@/lib/names";
import { notifyPendingAccount } from "@/lib/admin-notify";
import { skinFrom } from "@/lib/skin";
import { writeSkinCookies } from "@/lib/skin-cookies";

// Connexion « Continuer avec Google » (OpenID Connect, flux code + PKCE).
//
// Variables d'environnement :
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   identifiants du client OAuth (Google Cloud Console)
//   ALLOWED_EMAIL_DOMAINS                      domaines acceptés tout de suite (ex. 3is.fr) ; les autres adresses
//                                              Google arrivent « en attente » de validation par un admin
//   APP_URL                                    adresse publique du site (obligatoire en production)
//   GOOGLE_AUTH_URL / GOOGLE_TOKEN_URL         (facultatif, tests) remplacent les adresses de Google

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const authUrl = process.env.GOOGLE_AUTH_URL ?? "https://accounts.google.com/o/oauth2/v2/auth";
  const tokenUrl = process.env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
  // Le jeton d'identité est reçu directement de Google en HTTPS : autre transport refusé en production.
  if (process.env.NODE_ENV === "production" && !(authUrl.startsWith("https://") && tokenUrl.startsWith("https://"))) return null;
  return { clientId, clientSecret, authUrl, tokenUrl, domains: allowedDomainsFromEnv() };
}

export type GoogleConfig = NonNullable<ReturnType<typeof googleConfig>>;
export const googleEnabled = () => googleConfig() !== null;

/**
 * Cookie propre à chaque tentative de connexion (le nom contient le début de l'état) : un préchargement du lien par le navigateur
 * ou Cloudflare, un double clic ou deux onglets ne peuvent plus écraser l'état d'une connexion en cours.
 */
export const googleCookieName = (state: string) => `goauth_${state.slice(0, 12)}`;

export const googleRedirectUri = (base: string) => `${base}/api/auth/google/callback`;

export function googleAuthorizeUrl(cfg: GoogleConfig, base: string, s: { state: string; nonce: string; verifier: string }) {
  const q = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: googleRedirectUri(base),
    scope: "openid email profile",
    state: s.state,
    nonce: s.nonce,
    code_challenge: challengeFor(s.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${cfg.authUrl}?${q}`;
}

export type GoogleClaims = { iss?: string; aud?: string; exp?: number; nonce?: string; sub?: string; email?: string; email_verified?: boolean | string; name?: string; given_name?: string; family_name?: string };

export type GoogleIdentity = { sub: string; email: string; name: string; firstName: string; lastName: string; trusted: boolean };

export type GoogleCheck = { ok: true; identity: GoogleIdentity } | { ok: false; code: "google-echec" | "google-email-non-verifie" };

/**
 * Vérifie les revendications du jeton (reçu directement de Google en HTTPS, avec le secret du client).
 * `trusted` = l'adresse est dans un domaine autorisé (3is.fr) : accès immédiat. Sinon : compte « en attente ».
 */
export function validateGoogleClaims(c: GoogleClaims, cfg: GoogleConfig, nonce: string): GoogleCheck {
  if (c.aud !== cfg.clientId) return { ok: false, code: "google-echec" };
  if (!c.exp || c.exp * 1000 < Date.now()) return { ok: false, code: "google-echec" };
  if (!c.nonce || c.nonce !== nonce) return { ok: false, code: "google-echec" };
  if (c.iss && c.iss !== "https://accounts.google.com" && c.iss !== "accounts.google.com" && process.env.NODE_ENV === "production") return { ok: false, code: "google-echec" };
  const email = (c.email ?? "").trim().toLowerCase();
  if (!c.sub || !email.includes("@")) return { ok: false, code: "google-echec" };
  // Une adresse non vérifiée par Google ne prouve rien : on refuse.
  if (c.email_verified !== true && c.email_verified !== "true") return { ok: false, code: "google-email-non-verifie" };
  // Google fournit prénom et nom séparément quand le profil les renseigne ; sinon on découpe le nom affiché.
  const fallback = splitName(c.name ?? email.split("@")[0]);
  const firstName = (c.given_name ?? fallback.first).trim().slice(0, 60);
  const lastName = (c.family_name ?? fallback.last).trim().slice(0, 60);
  const name = joinName(firstName, lastName).slice(0, 120) || email;
  return { ok: true, identity: { sub: c.sub.slice(0, 40), email: email.slice(0, 190), name, firstName, lastName, trusted: emailInDomains(email, cfg.domains) } };
}

/**
 * Retrouve ou crée le compte lié à l'identité Google, puis ouvre la session.
 * - déjà lié : connexion directe ;
 * - un compte à mot de passe existe avec cette adresse : lié à Google, ancien mot de passe et sessions révoqués
 *   (le titulaire réel de l'adresse, vérifiée par Google, reprend la main) ;
 * - sinon : nouveau compte. Adresse d'un domaine autorisé = actif (et administrateur si c'est le tout premier
 *   compte) ; toute autre adresse = « en attente » de validation.
 */
export async function signInWithGoogle(identity: GoogleIdentity): Promise<{ user: User; created: boolean }> {
  const open = async (user: User) => {
    await createSession(user.id);
    await writeSkinCookies(skinFrom(user));
  };

  const [linked] = await db.select().from(users).where(eq(users.googleSub, identity.sub)).limit(1);
  if (linked) {
    await open(linked);
    return { user: linked, created: false };
  }

  const [existing] = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
  if (existing) {
    const unusable = await hashPassword(newSecret(48));
    await db.update(users).set({ googleSub: identity.sub, passwordHash: unusable, name: identity.name, firstName: identity.firstName, lastName: identity.lastName }).where(eq(users.id, existing.id));
    await db.delete(sessions).where(eq(sessions.userId, existing.id));
    await open(existing);
    return { user: { ...existing, googleSub: identity.sub, name: identity.name, firstName: identity.firstName, lastName: identity.lastName }, created: false };
  }

  // Seuls les comptes ACTIFS comptent : un compte Google en attente ne doit pas empêcher le premier vrai compte de devenir administrateur.
  const [{ total }] = await db.select({ total: count() }).from(users).where(eq(users.status, "active"));
  const status = identity.trusted ? "active" : "pending";
  const [res] = await db.insert(users).values({
    email: identity.email,
    name: identity.name,
    firstName: identity.firstName,
    lastName: identity.lastName,
    passwordHash: await hashPassword(newSecret(48)), // pas de mot de passe local : la connexion passe par Google
    // Jamais d'administrateur par Google personnel : le premier admin vient d'une adresse autorisée.
    roleId: await newUserRoleId(total === 0 && identity.trusted),
    status,
    googleSub: identity.sub,
  });
  const [created] = await db.select().from(users).where(eq(users.id, res.insertId)).limit(1);
  await open(created);
  if (status === "pending") await notifyPendingAccount({ name: created.name, email: created.email });
  return { user: created, created: true };
}
