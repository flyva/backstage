import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { googleConfig, googleCookieName, googleRedirectUri, signInWithGoogle, validateGoogleClaims, type GoogleClaims } from "@/lib/google";
import { appBaseUrl } from "@/lib/microsoft";
import { siteUrl } from "@/lib/site-url";

const back = (req: Request, code: string, detail = "", cookie?: string) => {
  // Journal (sans aucune donnée secrète) : indique pourquoi la connexion a échoué.
  console.error(`[google] connexion refusée : ${code}${detail ? ` (${detail})` : ""}`);
  const res = NextResponse.redirect(siteUrl(`/login?erreur=${code}`, req));
  if (cookie) res.cookies.delete({ name: cookie, path: "/api/auth/google" });
  return res;
};

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function GET(req: Request) {
  const cfg = googleConfig();
  const base = appBaseUrl(req);
  if (!cfg || !base) return back(req, "google-indisponible");

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back(req, "google-refuse"); // l'utilisateur a annulé
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Le cookie de cette tentative est retrouvé par son nom (dérivé de l'état renvoyé par Google).
  const cookieName = state && /^[A-Za-z0-9_-]{20,}$/.test(state) ? googleCookieName(state) : null;
  let saved: { state: string; nonce: string; verifier: string } | null = null;
  try {
    const found = cookieName ? req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${cookieName}=`)) : undefined;
    if (found && cookieName) saved = JSON.parse(decodeURIComponent(found.slice(cookieName.length + 1)));
  } catch {
    saved = null;
  }
  if (!code || !state || !saved || !same(state, saved.state)) {
    const why = !code ? "code absent" : !state ? "état absent" : !saved ? `cookie google_oauth absent (cookies reçus : ${req.headers.get("cookie") ? "oui" : "aucun"}, hôte : ${req.headers.get("host") ?? "?"})` : "état différent de celui du cookie";
    return back(req, "session-expiree", why, cookieName ?? undefined);
  }

  // Échange du code contre le jeton d'identité (serveur à serveur, avec le secret du client).
  let idToken: string | undefined;
  try {
    const res = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: googleRedirectUri(base),
        code_verifier: saved.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return back(req, "google-echec", `échange du code refusé par Google : HTTP ${res.status}`, cookieName ?? undefined);
    idToken = ((await res.json()) as { id_token?: string }).id_token;
  } catch {
    return back(req, "google-echec", "échange du code impossible (réseau)", cookieName ?? undefined);
  }

  let claims: GoogleClaims | null = null;
  try {
    const part = idToken?.split(".")[1];
    claims = part ? (JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as GoogleClaims) : null;
  } catch {
    claims = null;
  }
  if (!claims) return back(req, "google-echec", "jeton d'identité illisible", cookieName ?? undefined);
  const check = validateGoogleClaims(claims, cfg, saved.nonce);
  if (!check.ok) return back(req, check.code, "jeton d'identité refusé", cookieName ?? undefined);

  const { user, created } = await signInWithGoogle(check.identity);
  // Compte personnel non validé : page d'attente (il n'a accès à rien d'autre).
  const target = user.status !== "active" ? "/en-attente" : created ? "/profil?bienvenue=1" : "/";
  const res = NextResponse.redirect(siteUrl(target, req));
  if (cookieName) res.cookies.delete({ name: cookieName, path: "/api/auth/google" });
  return res;
}
