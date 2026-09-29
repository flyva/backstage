import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowDown, ArrowUp, Pencil, Play, Trash2 } from "lucide-react";
import { db } from "@/db";
import { cues } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { deleteCue, moveCue } from "@/lib/project-actions";
import { CATEGORY_LABEL, formatDuration } from "@/lib/time";
import { AddCueForm, EditCueForm } from "@/components/cue-forms";

export const metadata = { title: "Conduite" };

export default async function CueListPage({ params }: PageProps<"/projets/[id]/conduite">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  const canEdit = can(role, "editor");
  const list = await db.select().from(cues).where(eq(cues.projectId, project.id)).orderBy(asc(cues.position), asc(cues.id));

  // Temps cumulé : heure de départ de chaque cue depuis le début du spectacle.
  const starts = list.reduce<number[]>((out, c, i) => [...out, i === 0 ? 0 : out[i - 1] + (list[i - 1].durationSec ?? 0)], []);
  const rows = list.map((c, i) => ({ c, i, startAt: starts[i] }));
  const acc = list.reduce((sum, c) => sum + (c.durationSec ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {list.length} cue{list.length > 1 ? "s" : ""} · durée totale <strong className="text-fg">{formatDuration(acc)}</strong>
        </p>
        {list.length > 0 && (
          <Link href={`/projets/${project.id}/jour-j`} className="btn"><Play size={16} /> Mode Jour J</Link>
        )}
      </div>

      {list.length === 0 && <p className="text-sm text-muted">Aucune cue pour le moment.</p>}

      <ol className="space-y-2">
        {rows.map(({ c, i, startAt }) => (
          <li key={c.id} className="card p-0">
            <div className="flex items-start gap-3 p-3">
              <div className="w-12 shrink-0 pt-0.5 text-center font-mono text-sm font-bold tabular-nums text-accent">{c.number ?? i + 1}</div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-line px-1.5 py-0.5 text-xs text-muted">{CATEGORY_LABEL[c.category]}</span>
                  <span className="font-medium">{c.title}</span>
                </div>
                {c.notes && <p className="whitespace-pre-line text-sm text-muted">{c.notes}</p>}
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-muted">
                <div className="text-sm font-medium text-fg">{formatDuration(c.durationSec)}</div>
                <div title="Heure de départ depuis le début">T+{formatDuration(startAt)}</div>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1">
                  <form action={moveCue}>
                    <input type="hidden" name="cueId" value={c.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button disabled={i === 0} className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label="Monter"><ArrowUp size={16} /></button>
                  </form>
                  <form action={moveCue}>
                    <input type="hidden" name="cueId" value={c.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button disabled={i === list.length - 1} className="p-1 text-muted hover:text-fg disabled:opacity-30" aria-label="Descendre"><ArrowDown size={16} /></button>
                  </form>
                  <form action={deleteCue}>
                    <input type="hidden" name="cueId" value={c.id} />
                    <button className="p-1 text-muted hover:text-danger" aria-label={`Supprimer la cue ${c.title}`}><Trash2 size={16} /></button>
                  </form>
                </div>
              )}
            </div>
            {canEdit && (
              <details className="border-t border-line">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-fg marker:hidden">
                  <Pencil size={12} /> Modifier
                </summary>
                <div className="p-3 pt-1">
                  <EditCueForm
                    cueId={c.id}
                    defaults={{
                      number: c.number ?? "",
                      title: c.title,
                      category: c.category,
                      duration: c.durationSec == null ? "" : formatDuration(c.durationSec),
                      notes: c.notes ?? "",
                    }}
                  />
                </div>
              </details>
            )}
          </li>
        ))}
      </ol>

      {canEdit && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Ajouter une cue</h2>
          <AddCueForm projectId={project.id} />
        </section>
      )}
    </div>
  );
}
