import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { techInputs, techLights } from "@/db/schema";
import { requireProject } from "@/lib/projects";
import { toCsv } from "@/lib/csv";
import { slugify } from "@/lib/wiki";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await ctx.params;
  const { project } = await requireProject(Number(id)); // 404 si l'utilisateur n'est pas membre
  const base = slugify(project.name);

  let csv: string;
  let name: string;
  if (type === "lights") {
    const rows = await db.select().from(techLights).where(eq(techLights.projectId, project.id)).orderBy(asc(techLights.channel), asc(techLights.universe), asc(techLights.address));
    csv = toCsv(
      ["Circuit", "Nom", "Mode", "Univers", "Adresse", "Nb canaux", "Position", "Gélatine", "Notes"],
      rows.map((r) => [r.channel, r.label, r.mode, r.universe, r.address, r.footprint, r.position, r.color, r.notes]),
    );
    name = `${base}-patch-lumiere.csv`;
  } else if (type === "inputs") {
    const rows = await db.select().from(techInputs).where(eq(techInputs.projectId, project.id)).orderBy(asc(techInputs.channel));
    csv = toCsv(
      ["Canal", "Source", "Micro / DI", "Pied", "+48 V", "Notes"],
      rows.map((r) => [r.channel, r.source, r.mic, r.stand, r.phantom ? "oui" : "", r.notes]),
    );
    name = `${base}-entrees-son.csv`;
  } else {
    return new Response("Introuvable", { status: 404 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
