import "server-only";
import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const MAX_MESSAGE_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_MESSAGE_FILES = 6;

export const messageFilesDir = () => path.join(process.cwd(), "data", "uploads", "messages");
export const ensureMessageFilesDir = () => mkdir(messageFilesDir(), { recursive: true });

type Ext = "pdf" | "jpg" | "png" | "gif" | "zip";
export const MESSAGE_FILE_NAME = /^[a-f0-9]{24}\.(pdf|jpg|png|gif|zip)$/;
export const newMessageFileName = (ext: Ext) => `${randomBytes(12).toString("hex")}.${ext}`;

/** Détecte le vrai type d'après les premiers octets : le nom ou le type MIME envoyés par le client ne comptent pas. */
export function sniffMessageFile(b: Uint8Array): { ext: Ext; mime: string } | null {
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { ext: "pdf", mime: "application/pdf" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { ext: "gif", mime: "image/gif" };
  // ZIP (donc aussi Word, Excel, PowerPoint…) : toujours servi en téléchargement, jamais affiché.
  if (b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return { ext: "zip", mime: "application/octet-stream" };
  return null;
}

export const isImageMime = (mime: string) => mime.startsWith("image/");

export async function removeMessageFile(name: string) {
  if (MESSAGE_FILE_NAME.test(name)) await unlink(path.join(messageFilesDir(), name)).catch(() => {});
}
