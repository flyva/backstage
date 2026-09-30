import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { techInputs, techLights } from "@/db/schema";
import { requireProject } from "@/lib/projects";
import { toCsv } from "@/lib/csv";
import { slugify } from "@/lib/wiki";
import { checklistsCsv, conduiteCsv, dossierHtml, equipeCsv, loadDossier } from "@/lib/dossier";

// Téléchargements d'un projet : fiches (lights, inputs), conduite, équipe, checklists (CSV) et dossier complet (HTML).
export async function GET(_: Request, ctx: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await ctx.params;
  const { project, role } = await requireProject(Number(id)); // 404 si l'utilisateur n'est pas membre
  const base = slugify(project.name);

  let body: string;
  let name: string;
  let mime = "text/csv; charset=utf-8";
  if (type === "lights") {
    const rows = await db.select().from(techLights).where(eq(techLights.projectId, project.id)).orderBy(asc(techLights.channel), asc(techLights.universe), asc(techLights.address));
    body = toCsv(
      ["Circuit", "Nom", "Mode", "Univers", "Adresse", "Nb canaux", "Position", "Gélatine", "Notes"],
      rows.map((r) => [r.channel, r.label, r.mode, r.universe, r.address, r.footprint, r.position, r.color, r.notes]),
    );
    name = `${base}-patch-lumiere.csv`;
  } else if (type === "inputs") {
    const rows = await db.select().from(techInputs).where(eq(techInputs.projectId, project.id)).orderBy(asc(techInputs.channel));
    body = toCsv(
      ["Canal", "Source", "Micro / DI", "Pied", "Fantôme (+48 V)", "Notes"],
      rows.map((r) => [r.channel, r.source, r.mic, r.stand, r.phantom ? "oui" : "", r.notes]),
    );
    name = `${base}-entrees-son.csv`;
  } else if (type === "conduite" || type === "equipe" || type === "checklists" || type === "complet") {
    const d = await loadDossier(project, role);
    if (type === "conduite") { body = conduiteCsv(d); name = `${base}-conduite.csv`; }
    else if (type === "equipe") { body = equipeCsv(d); name = `${base}-equipe.csv`; }
    else if (type === "checklists") { body = checklistsCsv(d); name = `${base}-checklists.csv`; }
    else { body = dossierHtml(project, d); name = `${base}-dossier-complet.html`; mime = "text/html; charset=utf-8"; }
  } else {
    return new Response("Introuvable", { status: 404 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      // Le fichier HTML ne doit jamais s'exécuter dans l'origine de l'application s'il est affiché depuis le navigateur.
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
      "Cache-Control": "private, no-store",
    },
  });
}
