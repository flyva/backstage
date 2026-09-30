import "server-only";
import path from "node:path";
import { mkdir, readdir, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const MAX_WIKI_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_WIKI_TOTAL_BYTES = Number(process.env.WIKI_FILES_MAX_MB || 512) * 1024 * 1024;

export const WIKI_URL_PREFIX = "/api/wiki/files/";
export const wikiFilesDir = () => path.join(process.cwd(), "data", "uploads", "wiki");
export const ensureWikiFilesDir = () => mkdir(wikiFilesDir(), { recursive: true });

export const WIKI_FILE_NAME = /^[a-f0-9]{24}\.(jpg|png|gif|webp|pdf|zip)$/;
export type WikiExt = "jpg" | "png" | "gif" | "webp" | "pdf" | "zip";
export const newWikiFileName = (ext: WikiExt) => `${randomBytes(12).toString("hex")}.${ext}`;

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));

/** Détecte le vrai type d'après les premiers octets (le nom et le type MIME envoyés par le client ne comptent pas). */
export function sniffWiki(b: Uint8Array): { ext: WikiExt; mime: string; image: boolean } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg", image: true };
  if (b.length > 8 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG") return { ext: "png", mime: "image/png", image: true };
  if (b.length > 6 && (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a")) return { ext: "gif", mime: "image/gif", image: true };
  if (b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp", image: true };
  if (b.length > 4 && ascii(b, 0, 4) === "%PDF") return { ext: "pdf", mime: "application/pdf", image: false };
  // ZIP (donc aussi Word, Excel, PowerPoint, OpenDocument…) : toujours servi en téléchargement.
  if (b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return { ext: "zip", mime: "application/octet-stream", image: false };
  return null;
}

export async function wikiFilesUsage(): Promise<number> {
  try {
    const files = await readdir(wikiFilesDir());
    const sizes = await Promise.all(files.map((f) => stat(path.join(wikiFilesDir(), f)).then((s) => s.size).catch(() => 0)));
    return sizes.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}
