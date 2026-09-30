import { writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { wikiFiles } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/gallery";
import { allow } from "@/lib/rate-limit";
import {
  ensureWikiFilesDir, MAX_WIKI_FILE_BYTES, MAX_WIKI_TOTAL_BYTES, newWikiFileName, sniffWiki, WIKI_URL_PREFIX, wikiFilesDir, wikiFilesUsage,
} from "@/lib/wiki-files";

const json = (body: object, status = 200) => Response.json(body, { status });

// Envoi d'une image ou d'un fichier depuis l'éditeur (wiki, articles). Réponses JSON : appelé par fetch.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origine refusée" }, 403);
  const user = await getUser();
  if (!user) return json({ error: "Non connecté" }, 401);
  if (!allow(`wiki-upload:${user.id}`, 40, 10 * 60_000)) return json({ error: "Trop d'envois, réessaie dans quelques minutes" }, 429);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_WIKI_FILE_BYTES + 100_000) return json({ error: "Fichier trop lourd (10 Mo max)" }, 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "Requête invalide" }, 400);
  if (file.size === 0 || file.size > MAX_WIKI_FILE_BYTES) return json({ error: "Fichier vide ou trop lourd (10 Mo max)" }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffWiki(bytes);
  if (!kind) return json({ error: "Format non supporté (image JPEG/PNG/GIF/WebP, PDF, Word, Excel, PowerPoint ou ZIP)" }, 415);
  if ((await wikiFilesUsage()) + bytes.length > MAX_WIKI_TOTAL_BYTES) return json({ error: "Espace de stockage plein" }, 507);

  await ensureWikiFilesDir();
  const name = newWikiFileName(kind.ext);
  await writeFile(path.join(wikiFilesDir(), name), bytes);
  const original = file.name.replace(/[\u0000-\u001f\\/\[\]()]/g, "_").slice(0, 200) || `fichier.${kind.ext}`;
  await db.insert(wikiFiles).values({ file: name, originalName: original, mime: kind.mime, size: bytes.length, uploadedBy: user.id });
  return json({ ok: true, url: `${WIKI_URL_PREFIX}${name}`, name: original, image: kind.image });
}
