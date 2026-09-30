import { readFile } from "node:fs/promises";
import path from "node:path";
import { AVATAR_NAME, avatarDir, sniffAvatar } from "@/lib/avatar-files";

// Photos de profil : le nom est aléatoire (non devinable) et la route est publique, car la carte de visite l'est aussi.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!AVATAR_NAME.test(file)) return new Response("Introuvable", { status: 404 });
  try {
    const buf = await readFile(path.join(avatarDir(), file));
    const type = sniffAvatar(buf);
    if (!type) return new Response("Introuvable", { status: 404 });
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": type.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
