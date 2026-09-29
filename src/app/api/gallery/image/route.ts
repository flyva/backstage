import { writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { galleryAlbums, galleryItems } from "@/db/schema";
import { getUser } from "@/lib/auth";
import {
  ensureGalleryDir, galleryDir, galleryUsageBytes, isJpeg, MAX_IMAGE_BYTES, MAX_THUMB_BYTES, MAX_TOTAL_BYTES,
  newFileName, removeMedia, sameOrigin,
} from "@/lib/gallery";

const json = (body: object, status = 200) => Response.json(body, { status });

// Le navigateur redimensionne la photo (JPEG ≤ 1600 px) et fabrique la miniature : le serveur (Pi 32 bits,
// sans sharp) n'a rien à décoder, il vérifie seulement la taille et la signature JPEG.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Origine refusée" }, 403);
  const user = await getUser();
  if (!user) return json({ error: "Non connecté" }, 401);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + MAX_THUMB_BYTES + 100_000) {
    return json({ error: "Image trop lourde" }, 413);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const thumb = form?.get("thumb");
  const albumId = Number(form?.get("albumId"));
  if (!(file instanceof File) || !(thumb instanceof File) || !Number.isInteger(albumId)) return json({ error: "Requête invalide" }, 400);
  if (file.size > MAX_IMAGE_BYTES || thumb.size > MAX_THUMB_BYTES) return json({ error: "Image trop lourde" }, 413);

  const [album] = await db.select({ id: galleryAlbums.id }).from(galleryAlbums).where(eq(galleryAlbums.id, albumId)).limit(1);
  if (!album) return json({ error: "Album introuvable" }, 404);

  const [mainBytes, thumbBytes] = await Promise.all([file.arrayBuffer(), thumb.arrayBuffer()]);
  if (!isJpeg(new Uint8Array(mainBytes)) || !isJpeg(new Uint8Array(thumbBytes))) return json({ error: "Format non supporté (JPEG attendu)" }, 415);
  if ((await galleryUsageBytes()) + mainBytes.byteLength + thumbBytes.byteLength > MAX_TOTAL_BYTES) {
    return json({ error: "Espace de stockage plein" }, 507);
  }

  await ensureGalleryDir();
  const fileName = newFileName("jpg");
  const thumbName = newFileName("jpg");
  try {
    await writeFile(path.join(galleryDir(), fileName), Buffer.from(mainBytes));
    await writeFile(path.join(galleryDir(), thumbName), Buffer.from(thumbBytes));
    const caption = String(form?.get("caption") ?? "").trim().slice(0, 300) || null;
    await db.insert(galleryItems).values({ albumId, kind: "image", file: fileName, thumb: thumbName, caption, uploaderId: user.id });
  } catch {
    await removeMedia(fileName, thumbName);
    return json({ error: "Erreur d'enregistrement" }, 500);
  }
  return json({ ok: true });
}
