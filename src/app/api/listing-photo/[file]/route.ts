import { readFile } from "node:fs/promises";
import path from "node:path";
import { getUser } from "@/lib/auth";
import { sniffAvatar } from "@/lib/avatar-files";
import { listingDir } from "@/lib/listing-files";
import { LISTING_PHOTO_NAME } from "@/lib/listing-shared";

// Photos des annonces : réservées aux personnes connectées.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  if (!(await getUser())) return new Response("Non autorisé", { status: 401 });
  const { file } = await params;
  if (!LISTING_PHOTO_NAME.test(file)) return new Response("Introuvable", { status: 404 });
  try {
    const buf = await readFile(path.join(listingDir(), file));
    const type = sniffAvatar(buf);
    if (!type) return new Response("Introuvable", { status: 404 });
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": type.mime, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
