import "server-only";
import path from "node:path";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const MAX_PROJECT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_PROJECT_TOTAL_BYTES = Number(process.env.PROJECT_FILES_MAX_MB || 1024) * 1024 * 1024;

export const projectFilesDir = () => path.join(process.cwd(), "data", "uploads", "projects");
export const ensureProjectFilesDir = () => mkdir(projectFilesDir(), { recursive: true });

export const PROJECT_FILE_NAME = /^[a-f0-9]{24}\.(pdf|jpg|png|zip)$/;
export const newProjectFileName = (ext: "pdf" | "jpg" | "png" | "zip") => `${randomBytes(12).toString("hex")}.${ext}`;

/** Détecte le vrai type d'après les premiers octets : le nom ou le type MIME envoyés par le client ne comptent pas. */
export function sniff(b: Uint8Array): { ext: "pdf" | "jpg" | "png" | "zip"; mime: string } | null {
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { ext: "pdf", mime: "application/pdf" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  // ZIP (donc aussi Word, Excel, PowerPoint, OpenDocument…) : toujours servi en téléchargement, jamais affiché.
  if (b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return { ext: "zip", mime: "application/octet-stream" };
  return null;
}

export async function projectFilesUsage(): Promise<number> {
  try {
    const files = await readdir(projectFilesDir());
    const sizes = await Promise.all(files.map((f) => stat(path.join(projectFilesDir(), f)).then((s) => s.size).catch(() => 0)));
    return sizes.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

export async function removeProjectFile(name: string) {
  if (PROJECT_FILE_NAME.test(name)) await unlink(path.join(projectFilesDir(), name)).catch(() => {});
}
