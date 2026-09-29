import "server-only";
import { headers } from "next/headers";

// Limiteur en mémoire (un seul processus Node sur le Pi : suffisant, et sans base de données).
const g = globalThis as unknown as { __rateHits?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__rateHits ??= new Map());

/** Renvoie true si l'action est autorisée, false si la limite est atteinte sur la fenêtre. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Nettoyage occasionnel pour ne pas garder des clés éternellement.
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return true;
}

/** IP du client : cloudflared la fournit dans CF-Connecting-IP (le serveur n'écoute qu'en local). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}
