import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wikiFiles } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { WIKI_FILE_NAME, wikiFilesDir } from "@/lib/wiki-files";

// Servi aux seuls utilisateurs connectés et actifs.
export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { name } = await ctx.params;
  if (!WIKI_FILE_NAME.test(name)) return new Response("Introuvable", { status: 404 });
  const [row] = await db.select().from(wikiFiles).where(eq(wikiFiles.file, name)).limit(1);
  if (!row) return new Response("Introuvable", { status: 404 });
  const data = await readFile(path.join(wikiFilesDir(), name)).catch(() => null);
  if (!data) return new Response("Introuvable", { status: 404 });

  const safeName = row.originalName.replace(/["\r\n]/g, "_");
  const inline = row.mime !== "application/octet-stream";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": row.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options": "nosniff",
      // Type déterminé par les octets du fichier ; « sandbox » neutralise tout contenu actif (sauf PDF, que Chrome refuse sinon).
      ...(row.mime === "application/pdf" ? {} : { "Content-Security-Policy": "sandbox; default-src 'none'" }),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
