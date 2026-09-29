import { NextResponse } from "next/server";
import { appBaseUrl, authorizeUrl, microsoftConfig, newSecret } from "@/lib/microsoft";
import { allow, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const cfg = microsoftConfig();
  const base = appBaseUrl(req);
  if (!cfg || !base) return NextResponse.redirect(new URL("/login?erreur=microsoft-indisponible", req.url));
  if (!allow(`ms-login:${await clientIp()}`, 30, 10 * 60e3)) return NextResponse.redirect(new URL("/login?erreur=trop-de-tentatives", req.url));

  // État, nonce et vérificateur PKCE : gardés dans un cookie court, lus au retour de Microsoft.
  const s = { state: newSecret(), nonce: newSecret(), verifier: newSecret(48) };
  const res = NextResponse.redirect(authorizeUrl(cfg, base, s));
  res.cookies.set("ms_oauth", JSON.stringify(s), {
    httpOnly: true,
    sameSite: "lax", // doit accompagner la redirection venant de Microsoft
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/microsoft",
    maxAge: 600,
  });
  return res;
}
