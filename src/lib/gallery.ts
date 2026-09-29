import "server-only";
import path from "node:path";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_THUMB_BYTES = 1024 * 1024;
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
// Quota total du dossier (le Pi stocke sur une carte SD) : réglable via GALLERY_MAX_MB.
export const MAX_TOTAL_BYTES = Number(process.env.GALLERY_MAX_MB || 2048) * 1024 * 1024;

export const galleryDir = () => path.join(process.cwd(), "data", "uploads", "gallery");

export async function ensureGalleryDir() {
  await mkdir(galleryDir(), { recursive: true });
}

export const newFileName = (ext: "jpg" | "mp4" | "webm") => `${randomBytes(12).toString("hex")}.${ext}`;

/** Seuls les noms générés par nous sont servis / supprimés : pas de traversée de répertoire possible. */
export const MEDIA_NAME = /^[a-f0-9]{24}\.(jpg|mp4|webm)$/;

export const MIME: Record<string, string> = { jpg: "image/jpeg", mp4: "video/mp4", webm: "video/webm" };

export const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
export const isWebm = (b: Uint8Array) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
export const isMp4 = (b: Uint8Array) => b.length > 12 && String.fromCharCode(b[4], b[5], b[6], b[7]) === "ftyp";

export async function galleryUsageBytes(): Promise<number> {
  try {
    const files = await readdir(galleryDir());
    const sizes = await Promise.all(files.map((f) => stat(path.join(galleryDir(), f)).then((s) => s.size).catch(() => 0)));
    return sizes.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

export async function removeMedia(...names: (string | null | undefined)[]) {
  for (const n of names) {
    if (n && MEDIA_NAME.test(n)) await unlink(path.join(galleryDir(), n)).catch(() => {});
  }
}

/** Refuse les requêtes venant d'un autre site (défense en profondeur en plus de SameSite=Lax). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
