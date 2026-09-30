import "server-only";
import { headers } from "next/headers";
import { publicBaseUrl } from "@/lib/mail";

/** Adresse complète d'une page du site : APP_URL si défini, sinon celle de la requête en cours. */
export async function absoluteUrl(path: string): Promise<string> {
  const fixed = publicBaseUrl();
  if (fixed && process.env.APP_URL) return `${fixed}${path}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}${path}`;
}
