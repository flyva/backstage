import "server-only";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export const MAX_AVATAR_BYTES = 400 * 1024; // l'image est réduite côté navigateur (256 px) : bien en dessous
export const AVATAR_URL_PREFIX = "/api/avatar/";
export const avatarDir = () => path.join(process.cwd(), "data", "uploads", "avatars");
export const ensureAvatarDir = () => mkdir(avatarDir(), { recursive: true });
export const AVATAR_NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;
export const newAvatarName = (ext: "jpg" | "png" | "webp") => `${randomBytes(12).toString("hex")}.${ext}`;
export const avatarUrl = (file: string | null | undefined) => (file ? `${AVATAR_URL_PREFIX}${file}` : null);

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));

/** Type réel d'après les premiers octets (jamais le nom ni le type annoncés par le client). */
export function sniffAvatar(b: Uint8Array): { ext: "jpg" | "png" | "webp"; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG") return { ext: "png", mime: "image/png" };
  if (b.length > 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}
