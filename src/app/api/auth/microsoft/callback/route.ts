import { siteUrl } from "@/lib/site-url";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { allowedTenants, appBaseUrl, decodeIdToken, endpointTenant, microsoftConfig, redirectUri, signInWithMicrosoft, validateClaims } from "@/lib/microsoft";

const back = (req: Request, code: string) => {
  const res = NextResponse.redirect(siteUrl(`/login?erreur=${code}`, req));
  res.cookies.delete({ name: "ms_oauth", path: "/api/auth/microsoft" });
  return res;
};

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function GET(req: Request) {
  const cfg = microsoftConfig();
  const base = appBaseUrl(req);
  if (!cfg || !base) return back(req, "microsoft-indisponible");

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back(req, "microsoft-refuse"); // l'utilisateur a refusé, ou l'organisation bloque l'application
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  let saved: { state: string; nonce: string; verifier: string } | null = null;
  try {
    const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith("ms_oauth="));
    if (cookie) saved = JSON.parse(decodeURIComponent(cookie.slice("ms_oauth=".length)));
  } catch {
    saved = null;
  }
  if (!code || !state || !saved || !same(state, saved.state)) return back(req, "session-expiree");

  const tenants = await allowedTenants(cfg);
  if (tenants.length === 0) return back(req, "microsoft-indisponible");

  // Échange du code contre le jeton d'identité (serveur à serveur, avec le secret de l'application).
  let idToken: string | undefined;
  try {
    const res = await fetch(`${cfg.authority}/${endpointTenant(tenants)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(base),
        code_verifier: saved.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return back(req, "microsoft-echec");
    idToken = ((await res.json()) as { id_token?: string }).id_token;
  } catch {
    return back(req, "microsoft-echec");
  }

  const claims = idToken ? decodeIdToken(idToken) : null;
  if (!claims) return back(req, "microsoft-echec");
  const check = validateClaims(claims, cfg, tenants, saved.nonce);
  if (!check.ok) return back(req, check.code);

  const { created } = await signInWithMicrosoft(check.identity);
  const res = NextResponse.redirect(siteUrl(created ? "/profil?bienvenue=1" : "/", req));
  res.cookies.delete({ name: "ms_oauth", path: "/api/auth/microsoft" });
  return res;
}
