import "server-only";
import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { LISTING_PHOTO_NAME } from "@/lib/listing-shared";

export const listingDir = () => path.join(process.cwd(), "data", "uploads", "listings");
export const ensureListingDir = () => mkdir(listingDir(), { recursive: true });
export const newListingPhotoName = (ext: "jpg" | "png" | "webp") => `${randomBytes(12).toString("hex")}.${ext}`;

export async function removeListingPhoto(file: string | null | undefined) {
  if (file && LISTING_PHOTO_NAME.test(file)) await unlink(path.join(listingDir(), file)).catch(() => {});
}
