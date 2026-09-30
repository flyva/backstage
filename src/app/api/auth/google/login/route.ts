import { NextResponse } from "next/server";
import { googleAuthorizeUrl, googleConfig, googleCookieName } from "@/lib/google";
import { appBaseUrl, newSecret } from "@/lib/microsoft";
import { siteUrl } from "@/lib/site-url";
import { allow, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Le navigateur (ou Cloudflare) peut précharger un lien au survol : on ne démarre pas de connexion pour un préchargement.
  const purpose = `${req.headers.get("sec-purpose") ?? ""} ${req.headers.get("purpose") ?? ""}`;
  if (/prefetch|prerender/i.test(purpose)) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  const cfg = googleConfig();
  const base = appBaseUrl(req);
  if (!cfg || !base) return NextResponse.redirect(siteUrl("/login?erreur=google-indisponible", req));
  if (!allow(`google-login:${await clientIp()}`, 30, 10 * 60e3)) return NextResponse.redirect(siteUrl("/login?erreur=trop-de-tentatives", req));

  // État, nonce et vérificateur PKCE : gardés dans un cookie court, lus au retour de Google.
  const s = { state: newSecret(), nonce: newSecret(), verifier: newSecret(48) };
  const res = NextResponse.redirect(googleAuthorizeUrl(cfg, base, s));
  res.headers.set("Cache-Control", "no-store"); // jamais mis en cache : chaque passage crée un état neuf
  res.cookies.set(googleCookieName(s.state), JSON.stringify(s), {
    httpOnly: true,
    sameSite: "lax", // doit accompagner la redirection venant de Google
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
