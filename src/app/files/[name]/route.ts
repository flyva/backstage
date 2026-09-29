import { readFile } from "node:fs/promises";
import path from "node:path";
import { getUser } from "@/lib/auth";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  if (!(await getUser())) return new Response("Non autorisé", { status: 401 });
  const { name } = await ctx.params;
  // Liste blanche stricte : aucune traversée de répertoire possible.
  const m = /^[a-z0-9-]+\.(png|jpg|webp)$/.exec(name);
  if (!m) return new Response("Introuvable", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "data", "uploads", name));
    return new Response(buf, {
      headers: { "Content-Type": TYPES[m[1]], "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
