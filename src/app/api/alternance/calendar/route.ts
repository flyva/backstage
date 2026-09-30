import { getUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/gallery";
import { allow } from "@/lib/rate-limit";
import { parseCalendarPdf } from "@/lib/calendar-pdf";

const json = (body: object, status = 200) => Response.json(body, { status });
const MAX_BYTES = 3 * 1024 * 1024;

// Analyse d'un calendrier de formation en PDF (aperçu) : rien n'est enregistré ici, c'est l'action « importer » qui écrit.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origine refusée" }, 403);
  const user = await getUser();
  if (!user) return json({ error: "Non connecté" }, 401);
  if (!allow(`calendar-pdf:${user.id}`, 12, 60 * 60_000)) return json({ error: "Trop d'essais, réessaie dans une heure" }, 429);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 50_000) return json({ error: "Fichier trop lourd (3 Mo max)" }, 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "Requête invalide" }, 400);
  if (file.size === 0 || file.size > MAX_BYTES) return json({ error: "Fichier vide ou trop lourd (3 Mo max)" }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Le type se vérifie sur le contenu, pas sur le nom : un vrai PDF commence par « %PDF ».
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) return json({ error: "Ce fichier n'est pas un PDF" }, 415);

  try {
    const parsed = await parseCalendarPdf(bytes);
    return json({ ok: true, ...parsed });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Lecture impossible" }, 422);
  }
}
