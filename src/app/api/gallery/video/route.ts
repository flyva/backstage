import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { galleryAlbums, galleryItems } from "@/db/schema";
import { getUser } from "@/lib/auth";
import {
  ensureGalleryDir, galleryDir, galleryUsageBytes, isMp4, isWebm, MAX_TOTAL_BYTES, MAX_VIDEO_BYTES, newFileName, removeMedia, sameOrigin,
} from "@/lib/gallery";

const json = (body: object, status = 200) => Response.json(body, { status });

// La vidéo arrive en flux brut (corps de la requête) et va directement sur le disque : jamais entière en mémoire.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origine refusée" }, 403);
  const user = await getUser();
  if (!user) return json({ error: "Non connecté" }, 401);

  const url = new URL(req.url);
  const albumId = Number(url.searchParams.get("albumId"));
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (!Number.isInteger(albumId) || !req.body) return json({ error: "Requête invalide" }, 400);
  if (declared > MAX_VIDEO_BYTES) return json({ error: "Vidéo trop lourde (150 Mo max)" }, 413);
  if ((await galleryUsageBytes()) + declared > MAX_TOTAL_BYTES) return json({ error: "Espace de stockage plein" }, 507);

  const [album] = await db.select({ id: galleryAlbums.id }).from(galleryAlbums).where(eq(galleryAlbums.id, albumId)).limit(1);
  if (!album) return json({ error: "Album introuvable" }, 404);

  await ensureGalleryDir();
  let ext: "mp4" | "webm" | null = null;
  let size = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      if (ext === null) {
        // Signature vérifiée sur le premier morceau ; le nom de fichier est décidé par nous, pas par le client.
        if (isMp4(chunk)) ext = "mp4";
        else if (isWebm(chunk)) ext = "webm";
        else return cb(new Error("BAD_FORMAT"));
      }
      size += chunk.length;
      if (size > MAX_VIDEO_BYTES) return cb(new Error("TOO_BIG"));
      cb(null, chunk);
    },
  });

  // Écrit sous un nom temporaire d'extension .mp4 (la signature n'est connue qu'au premier morceau) ;
  // on ne garde le fichier que si tout s'est bien passé, et on le nomme selon le format détecté.
  const tmpName = newFileName("mp4");
  const tmpPath = path.join(galleryDir(), tmpName);
  try {
    await pipeline(Readable.fromWeb(req.body as never), guard, createWriteStream(tmpPath));
  } catch (e) {
    await removeMedia(tmpName);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAD_FORMAT") return json({ error: "Format non supporté (MP4 ou WebM)" }, 415);
    if (msg === "TOO_BIG") return json({ error: "Vidéo trop lourde (150 Mo max)" }, 413);
    return json({ error: "Envoi interrompu" }, 400);
  }

  let finalName = tmpName;
  if (ext === "webm") {
    const { rename } = await import("node:fs/promises");
    finalName = newFileName("webm");
    await rename(tmpPath, path.join(galleryDir(), finalName));
  }
  if (ext === null) {
    await removeMedia(tmpName);
    return json({ error: "Fichier vide" }, 400);
  }

  const caption = (url.searchParams.get("caption") ?? "").trim().slice(0, 300) || null;
  try {
    await db.insert(galleryItems).values({ albumId, kind: "video", file: finalName, thumb: null, caption, uploaderId: user.id });
  } catch {
    await removeMedia(finalName);
    return json({ error: "Erreur d'enregistrement" }, 500);
  }
  return json({ ok: true });
}
