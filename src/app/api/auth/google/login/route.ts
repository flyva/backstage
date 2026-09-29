import { NextResponse } from "next/server";
import { googleAuthorizeUrl, googleConfig } from "@/lib/google";
import { appBaseUrl, newSecret } from "@/lib/microsoft";
import { allow, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const cfg = googleConfig();
  const base = appBaseUrl(req);
  if (!cfg || !base) return NextResponse.redirect(new URL("/login?erreur=google-indisponible", req.url));
  if (!allow(`google-login:${await clientIp()}`, 30, 10 * 60e3)) return NextResponse.redirect(new URL("/login?erreur=trop-de-tentatives", req.url));

  // État, nonce et vérificateur PKCE : gardés dans un cookie court, lus au retour de Google.
  const s = { state: newSecret(), nonce: newSecret(), verifier: newSecret(48) };
  const res = NextResponse.redirect(googleAuthorizeUrl(cfg, base, s));
  res.cookies.set("google_oauth", JSON.stringify(s), {
    httpOnly: true,
    sameSite: "lax", // doit accompagner la redirection venant de Google
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
