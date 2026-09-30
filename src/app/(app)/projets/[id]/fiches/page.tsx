import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { AlertTriangle, Download, FileText, Pencil, Printer, Trash2 } from "lucide-react";
import { db } from "@/db";
import { projectFiles, techInputs, techLights } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { deleteInput, deleteLight, deleteProjectFile } from "@/lib/tech-actions";
import { findConflicts, patchLabel } from "@/lib/tech";
import { AddInputForm, AddLightForm, EditInputForm, EditLightForm, FileUploader, ImportLightsForm } from "@/components/tech-forms";

export const metadata = { title: "Fiches techniques" };

const sizeFmt = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export default async function TechSheetsPage({ params }: PageProps<"/projets/[id]/fiches">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  const canEdit = can(role, "editor");

  const [lights, inputs, files] = await Promise.all([
    db.select().from(techLights).where(eq(techLights.projectId, project.id)).orderBy(asc(techLights.channel), asc(techLights.universe), asc(techLights.address), asc(techLights.id)),
    db.select().from(techInputs).where(eq(techInputs.projectId, project.id)).orderBy(asc(techInputs.channel), asc(techInputs.id)),
    db.select().from(projectFiles).where(and(eq(projectFiles.projectId, project.id), isNull(projectFiles.cardId))).orderBy(asc(projectFiles.createdAt)),
  ]);

  const conflicts = findConflicts(lights);
  const universes = [...new Set(lights.filter((l) => l.address !== null).map((l) => l.universe))].sort((a, b) => a - b);
  const dmxChannels = lights.filter((l) => l.address !== null).reduce((s, l) => s + l.footprint, 0);
  const base = `/projets/${project.id}/fiches`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Patch lumière, liste d&apos;entrées son et fiches papier du projet.</p>
        <Link href={`${base}/imprimer`} className="btn-ghost"><Printer size={16} /> Vue imprimable / PDF</Link>
      </div>

      {/* ---------- Lumière ---------- */}
      <section className="space-y-3" aria-labelledby="lumiere">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="lumiere" className="text-lg font-semibold">Patch lumière</h2>
          {lights.length > 0 && (
            <a href={`${base}/export/lights`} className="btn-ghost text-xs"><Download size={14} /> Export CSV</a>
          )}
        </div>
        {lights.length > 0 && (
          <p className="text-xs text-muted">
            {lights.length} projecteur{lights.length > 1 ? "s" : ""} · {dmxChannels} canaux DMX patchés · univers {universes.join(", ") || "–"}
            {conflicts.size > 0 && <span className="ml-2 font-medium text-danger">· {conflicts.size} conflit{conflicts.size > 1 ? "s" : ""}</span>}
          </p>
        )}
        {lights.length === 0 && <p className="text-sm text-muted">Aucun projecteur. Ajoute-les un par un ou importe un CSV.</p>}

        <ul className="space-y-1.5">
          {lights.map((l) => {
            const problems = conflicts.get(l.id);
            return (
              <li key={l.id} className={`card p-0 ${problems ? "border-danger" : ""}`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-2.5 text-sm">
                  <span className="w-10 text-right font-mono text-xs tabular-nums text-accent">{l.channel ?? "–"}</span>
                  <span className="min-w-40 flex-1 font-medium">{l.label}{l.mode && <span className="font-normal text-muted"> · {l.mode}</span>}</span>
                  <span className="w-16 font-mono text-xs tabular-nums" title="Univers.adresse">{patchLabel(l.universe, l.address)}</span>
                  <span className="w-14 text-xs text-muted" title="Canaux DMX occupés">{l.footprint} ch</span>
                  <span className="min-w-24 text-xs text-muted">{l.position}</span>
                  <span className="w-14 text-xs text-muted">{l.color}</span>
                  {canEdit && (
                    <form action={deleteLight}>
                      <input type="hidden" name="lightId" value={l.id} />
                      <button className="p-1 text-muted hover:text-danger" aria-label={`Supprimer ${l.label}`}><Trash2 size={14} /></button>
                    </form>
                  )}
                </div>
                {problems && (
                  <p className="flex items-start gap-1.5 border-t border-danger/40 px-2.5 py-1 text-xs text-danger">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {problems.join(" · ")}
                  </p>
                )}
                {l.notes && <p className="border-t border-line px-2.5 py-1 text-xs text-muted">{l.notes}</p>}
                {canEdit && (
                  <details className="border-t border-line">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1 text-xs text-muted hover:text-fg marker:hidden"><Pencil size={12} /> Modifier</summary>
                    <div className="px-2.5 pb-2.5"><EditLightForm light={l} /></div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>

        {canEdit && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card space-y-3"><h3 className="font-semibold">Ajouter un projecteur</h3><AddLightForm projectId={project.id} /></div>
            <div className="card space-y-3">
              <h3 className="font-semibold">Importer un patch (CSV)</h3>
              <p className="text-xs text-muted">Colonnes reconnues automatiquement : circuit, nom/type, mode, univers, adresse (ou « 2.045 »), nb canaux, position, gélatine, notes.</p>
              <ImportLightsForm projectId={project.id} />
            </div>
          </div>
        )}
      </section>

      {/* ---------- Son ---------- */}
      <section className="space-y-3" aria-labelledby="son">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="son" className="text-lg font-semibold">Liste d&apos;entrées son</h2>
          {inputs.length > 0 && <a href={`${base}/export/inputs`} className="btn-ghost text-xs"><Download size={14} /> Export CSV</a>}
        </div>
        {inputs.length === 0 && <p className="text-sm text-muted">Aucune entrée.</p>}
        <ul className="space-y-1.5">
          {inputs.map((i) => (
            <li key={i.id} className="card p-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-2.5 text-sm">
                <span className="w-8 text-right font-mono text-xs tabular-nums text-accent">{i.channel}</span>
                <span className="min-w-32 flex-1 font-medium">{i.source}</span>
                <span className="min-w-28 text-xs text-muted">{i.mic}</span>
                <span className="w-16 text-xs text-muted">{i.stand}</span>
                <span className="w-12 text-xs">{i.phantom ? "+48 V" : ""}</span>
                {canEdit && (
                  <form action={deleteInput}>
                    <input type="hidden" name="inputId" value={i.id} />
                    <button className="p-1 text-muted hover:text-danger" aria-label={`Supprimer ${i.source}`}><Trash2 size={14} /></button>
                  </form>
                )}
              </div>
              {i.notes && <p className="border-t border-line px-2.5 py-1 text-xs text-muted">{i.notes}</p>}
              {canEdit && (
                <details className="border-t border-line">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1 text-xs text-muted hover:text-fg marker:hidden"><Pencil size={12} /> Modifier</summary>
                  <div className="px-2.5 pb-2.5"><EditInputForm input={i} /></div>
                </details>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="card space-y-3">
            <h3 className="font-semibold">Ajouter une entrée</h3>
            <AddInputForm projectId={project.id} nextChannel={(inputs.at(-1)?.channel ?? 0) + 1} />
          </div>
        )}
      </section>

      {/* ---------- Fichiers ---------- */}
      <section className="space-y-3" aria-labelledby="fichiers">
        <h2 id="fichiers" className="text-lg font-semibold">Fiches papier et plans</h2>
        {files.length === 0 && <p className="text-sm text-muted">Aucun fichier. Ajoute un PDF ou une photo (plan de feu, rider, fiche scannée…).</p>}
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="card flex items-center gap-3 p-2.5 text-sm">
              <FileText size={16} className="shrink-0 text-accent" />
              <a href={`/api/projects/${project.id}/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:text-accent">{f.originalName}</a>
              <span className="text-xs text-muted">{sizeFmt(f.size)}</span>
              {canEdit && (
                <form action={deleteProjectFile}>
                  <input type="hidden" name="fileId" value={f.id} />
                  <button className="p-1 text-muted hover:text-danger" aria-label={`Supprimer ${f.originalName}`}><Trash2 size={14} /></button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {canEdit && <FileUploader projectId={project.id} />}
      </section>
    </div>
  );
}
