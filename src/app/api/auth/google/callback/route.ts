import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { googleConfig, googleRedirectUri, signInWithGoogle, validateGoogleClaims, type GoogleClaims } from "@/lib/google";
import { appBaseUrl } from "@/lib/microsoft";

const back = (req: Request, code: string) => {
  const res = NextResponse.redirect(new URL(`/login?erreur=${code}`, req.url));
  res.cookies.delete({ name: "google_oauth", path: "/api/auth/google" });
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

  let saved: { state: string; nonce: string; verifier: string } | null = null;
  try {
    const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith("google_oauth="));
    if (cookie) saved = JSON.parse(decodeURIComponent(cookie.slice("google_oauth=".length)));
  } catch {
    saved = null;
  }
  if (!code || !state || !saved || !same(state, saved.state)) return back(req, "session-expiree");

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
    if (!res.ok) return back(req, "google-echec");
    idToken = ((await res.json()) as { id_token?: string }).id_token;
  } catch {
    return back(req, "google-echec");
  }

  let claims: GoogleClaims | null = null;
  try {
    const part = idToken?.split(".")[1];
    claims = part ? (JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as GoogleClaims) : null;
  } catch {
    claims = null;
  }
  if (!claims) return back(req, "google-echec");
  const check = validateGoogleClaims(claims, cfg, saved.nonce);
  if (!check.ok) return back(req, check.code);

  const { user, created } = await signInWithGoogle(check.identity);
  // Compte personnel non validé : page d'attente (il n'a accès à rien d'autre).
  const target = user.status !== "active" ? "/en-attente" : created ? "/profil?bienvenue=1" : "/";
  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.delete({ name: "google_oauth", path: "/api/auth/google" });
  return res;
}
