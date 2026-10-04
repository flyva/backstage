import { readFile } from "node:fs/promises";
import path from "node:path";
import { siteIconPath } from "@/lib/site-icon";

// Icône du site, publique (le navigateur la demande sans être connecté).
export const dynamic = "force-dynamic";

export async function GET() {
  let bytes: Buffer;
  try {
    bytes = await readFile(siteIconPath());
  } catch {
    bytes = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "icon-512.png"));
  }
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=0, must-revalidate" } });
}
