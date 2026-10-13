import { readFile } from "node:fs/promises";
import path from "node:path";
import { siteIconMaskablePath } from "@/lib/site-icon";

// Version « maskable » de l'icône du site (avec marge de sécurité) : publique, demandée par le manifeste PWA.
export const dynamic = "force-dynamic";

export async function GET() {
  let bytes: Buffer;
  try {
    bytes = await readFile(siteIconMaskablePath());
  } catch {
    bytes = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "icon-maskable-512.png"));
  }
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=0, must-revalidate" } });
}
