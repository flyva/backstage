import { getUser } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";

// Suggestions d'adresses (Base Adresse Nationale, service public). Passer par le serveur évite d'envoyer l'adresse IP
// de chaque élève à un service tiers depuis son navigateur, et permet de limiter les appels.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Non connecté" }, { status: 401 });
  if (!allow(`addr:${user.id}`, 90, 60e3)) return Response.json({ error: "Trop de requêtes" }, { status: 429 });

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 120) ?? "";
  if (q.length < 3) return Response.json({ suggestions: [] });

  try {
    // lat/lon : priorité aux résultats proches de Bordeaux (l'école et la plupart des élèves).
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6&autocomplete=1&lat=44.84&lon=-0.58`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) return Response.json({ suggestions: [] });
    const data = (await res.json()) as { features?: { properties: { label: string; context?: string } }[] };
    const suggestions = (data.features ?? []).map((f) => ({ label: f.properties.label, context: f.properties.context ?? "" }));
    return Response.json({ suggestions }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
