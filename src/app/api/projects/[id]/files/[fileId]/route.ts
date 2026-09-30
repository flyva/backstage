import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projectFiles, projectMembers } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { PROJECT_FILE_NAME, projectFilesDir } from "@/lib/project-files";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; fileId: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const { id, fileId } = await ctx.params;
  const projectId = Number(id);
  const fid = Number(fileId);
  if (!Number.isInteger(projectId) || !Number.isInteger(fid)) return new Response("Introuvable", { status: 404 });

  // Le fichier n'est servi qu'aux membres du projet auquel il appartient (pas d'accès par simple deviner d'identifiant).
  const [row] = await db
    .select({ f: projectFiles })
    .from(projectFiles)
    .innerJoin(projectMembers, and(eq(projectMembers.projectId, projectFiles.projectId), eq(projectMembers.userId, user.id)))
    .where(and(eq(projectFiles.id, fid), eq(projectFiles.projectId, projectId)))
    .limit(1);
  if (!row || !PROJECT_FILE_NAME.test(row.f.file)) return new Response("Introuvable", { status: 404 });

  const data = await readFile(path.join(projectFilesDir(), row.f.file)).catch(() => null);
  if (!data) return new Response("Introuvable", { status: 404 });
  const safeName = row.f.originalName.replace(/["\r\n]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": row.f.mime,
      "Content-Disposition": `${row.f.mime === "application/octet-stream" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options": "nosniff",
      // Le type est déterminé par les octets du fichier (jamais par le client) et « nosniff » interdit toute
      // réinterprétation. Pas de CSP « sandbox » ici : elle empêche l'affichage des PDF dans Chrome.
      ...(row.f.mime === "application/pdf" ? {} : { "Content-Security-Policy": "sandbox; default-src 'none'" }),
      // Jamais de cache navigateur : sur un ordinateur partagé, le fichier ne doit pas survivre à la déconnexion.
      "Cache-Control": "private, no-store",
    },
  });
}
