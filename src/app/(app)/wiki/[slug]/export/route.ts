import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wikiPages } from "@/db/schema";
import { getUser } from "@/lib/auth";

// Téléchargement de la page en Markdown (.md), lisible dans n'importe quel éditeur.
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { slug } = await ctx.params;
  const [page] = await db.select().from(wikiPages).where(eq(wikiPages.slug, slug)).limit(1);
  if (!page) return new Response("Introuvable", { status: 404 });
  const file = page.slug.replace(/[^a-z0-9-]/g, "") || "page";
  return new Response(`# ${page.title}\n\n${page.body}\n`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}.md"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
