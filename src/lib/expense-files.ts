import "server-only";
import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const MAX_EXPENSE_PHOTO_BYTES = 15 * 1024 * 1024;

export const expenseFilesDir = () => path.join(process.cwd(), "data", "uploads", "expenses");
export const ensureExpenseFilesDir = () => mkdir(expenseFilesDir(), { recursive: true });

type Ext = "jpg" | "png";
export const EXPENSE_FILE_NAME = /^[a-f0-9]{24}\.(jpg|png)$/;
export const newExpenseFileName = (ext: Ext) => `${randomBytes(12).toString("hex")}.${ext}`;

/** Détecte le vrai type d'après les premiers octets (photo uniquement : le reçu est pris sur le vif). */
export function sniffExpensePhoto(b: Uint8Array): { ext: Ext; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  return null;
}

export async function removeExpensePhoto(name: string) {
  if (EXPENSE_FILE_NAME.test(name)) await unlink(path.join(expenseFilesDir(), name)).catch(() => {});
}
