import "server-only";
import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const MAX_WORK_LOG_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_WORK_LOG_PHOTOS = 10;

export const workLogFilesDir = () => path.join(process.cwd(), "data", "uploads", "work-logs");
export const ensureWorkLogFilesDir = () => mkdir(workLogFilesDir(), { recursive: true });

type Ext = "jpg" | "png";
export const WORK_LOG_FILE_NAME = /^[a-f0-9]{24}\.(jpg|png)$/;
export const newWorkLogFileName = (ext: Ext) => `${randomBytes(12).toString("hex")}.${ext}`;

/** Détecte le vrai type d'après les premiers octets (photos du travail réalisé : JPG/PNG uniquement). */
export function sniffWorkLogPhoto(b: Uint8Array): { ext: Ext; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  return null;
}

export async function removeWorkLogPhoto(name: string) {
  if (WORK_LOG_FILE_NAME.test(name)) await unlink(path.join(workLogFilesDir(), name)).catch(() => {});
}
