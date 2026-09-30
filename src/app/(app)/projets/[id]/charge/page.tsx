import { asc, eq } from "drizzle-orm";
import { AlertTriangle, Trash2, Zap } from "lucide-react";
import { db } from "@/db";
import { powerCircuits, powerItems } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { deleteCircuit, deleteItem, importLightsToPower } from "@/lib/build-actions";
import { VOLTS, circuitLoads, fmtAmps, fmtWatts, phaseLoads } from "@/lib/power";
import { CircuitForm, ItemForm } from "@/components/build-forms";

export const metadata = { title: "Charge électrique" };

const LEVEL_CLASS = { ok: "bg-emerald-500", warn: "bg-amber-500", over: "bg-danger" } as const;
const LEVEL_TEXT = { ok: "OK", warn: "Charge élevée (> 80 %)", over: "Surcharge" } as const;

export default async function PowerPage({ params }: PageProps<"/projets/[id]/charge">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  const canEdit = can(role, "editor");

  const [circuits, items] = await Promise.all([
    db.select().from(powerCircuits).where(eq(powerCircuits.projectId, project.id)).orderBy(asc(powerCircuits.position), asc(powerCircuits.id)),
    db.select().from(powerItems).where(eq(powerItems.projectId, project.id)).orderBy(asc(powerItems.name), asc(powerItems.id)),
  ]);
  const loads = circuitLoads(circuits, items);
  const phases = phaseLoads(loads);
  const totalW = items.reduce((s, i) => s + i.watts * i.qty, 0);
  const unassigned = items.filter((i) => i.circuitId === null);
  const maxPhase = Math.max(...phases.map((p) => p.watts));
  const minPhase = Math.min(...phases.map((p) => p.watts));
  const imbalance = phases.filter((p) => p.watts > 0).length > 1 && maxPhase > 0 ? Math.round(((maxPhase - minPhase) / maxPhase) * 100) : 0;
  const problems = loads.filter((l) => l.level !== "ok").length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Estimation en monophasé {VOLTS} V (facteur de puissance 1) : intensité = puissance ÷ {VOLTS}. Garde une marge : au-delà de 80 % du calibre, le circuit est signalé.
      </p>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-sm text-muted">Puissance totale</div><div className="text-3xl font-bold tabular-nums">{fmtWatts(totalW)}</div><div className="text-sm text-muted">{fmtAmps(totalW / VOLTS)} A en monophasé</div></div>
        <div className="card"><div className="text-sm text-muted">Circuits</div><div className="text-3xl font-bold tabular-nums">{circuits.length}</div><div className={`text-sm ${problems ? "font-medium text-danger" : "text-muted"}`}>{problems ? `${problems} à vérifier` : "Tout est dans la limite"}</div></div>
        <div className="card"><div className="text-sm text-muted">Non affecté</div><div className="text-3xl font-bold tabular-nums">{fmtWatts(unassigned.reduce((s, i) => s + i.watts * i.qty, 0))}</div><div className="text-sm text-muted">{unassigned.length} appareil(s)</div></div>
      </section>

      {circuits.length > 0 && (
        <section className="card space-y-3" aria-label="Équilibrage des phases">
          <h2 className="flex items-center gap-2 font-semibold"><Zap size={16} className="text-accent" /> Phases (triphasé)</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {phases.map((p) => (
              <li key={p.phase} className="rounded-xl border border-line bg-bg p-3 text-sm">
                <div className="text-muted">L{p.phase}</div>
                <div className="text-xl font-bold tabular-nums">{fmtWatts(p.watts)}</div>
                <div className="text-xs text-muted">{fmtAmps(p.amps)} A</div>
              </li>
            ))}
          </ul>
          {imbalance > 25 && <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400"><AlertTriangle size={14} /> Phases déséquilibrées ({imbalance} % d&apos;écart) : répartis les circuits entre L1, L2 et L3.</p>}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Circuits</h2>
        {loads.length === 0 && <p className="text-sm text-muted">Crée un circuit par gradateur ou par prise (avec son calibre), puis affecte-y tes appareils.</p>}
        {loads.map((l) => {
          const its = items.filter((i) => i.circuitId === l.circuit.id);
          return (
            <div key={l.circuit.id} className="card space-y-2 p-0">
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-semibold">{l.circuit.name}</h3>
                  <span className="text-xs text-muted">{l.circuit.breakerAmps} A · L{l.circuit.phase}</span>
                  <span className="ml-auto text-sm tabular-nums">{fmtWatts(l.watts)} · {fmtAmps(l.amps)} A · {Math.round(l.pct)} %</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(l.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Charge de ${l.circuit.name}`}>
                  <div className={`h-full ${LEVEL_CLASS[l.level]}`} style={{ width: `${Math.min(100, l.pct)}%` }} />
                </div>
                {l.level !== "ok" && <p className={`flex items-center gap-1 text-xs font-medium ${l.level === "over" ? "text-danger" : "text-amber-600 dark:text-amber-400"}`}><AlertTriangle size={12} /> {LEVEL_TEXT[l.level]}</p>}
                {its.length > 0 && <p className="text-xs text-muted">{its.map((i) => `${i.qty} × ${i.name}`).join(" · ")}</p>}
              </div>
              {canEdit && (
                <details className="border-t border-line">
                  <summary className="cursor-pointer list-none px-3 py-1.5 text-xs text-muted hover:text-fg marker:hidden">Modifier le circuit</summary>
                  <div className="space-y-3 p-3 pt-1">
                    <CircuitForm projectId={project.id} id={l.circuit.id} name={l.circuit.name} breakerAmps={l.circuit.breakerAmps} phase={l.circuit.phase} />
                    <form action={deleteCircuit} className="border-t border-line pt-3">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="id" value={l.circuit.id} />
                      <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer (les appareils restent, non affectés)</button>
                    </form>
                  </div>
                </details>
              )}
            </div>
          );
        })}
        {canEdit && (
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold">Ajouter un circuit</h3>
            <CircuitForm projectId={project.id} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Appareils ({items.length})</h2>
          {canEdit && (
            <form action={importLightsToPower}>
              <input type="hidden" name="projectId" value={project.id} />
              <button className="btn-ghost text-xs">Importer depuis la fiche lumière</button>
            </form>
          )}
        </div>
        {items.length === 0 && <p className="text-sm text-muted">Aucun appareil. Ajoute-les un par un, ou importe les projecteurs de la fiche lumière (la puissance vient de la bibliothèque quand elle y est).</p>}
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="card p-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
                <span className="min-w-0 flex-1 font-medium">{i.name}</span>
                <span className="tabular-nums text-muted">{i.qty} × {i.watts} W = {fmtWatts(i.qty * i.watts)}</span>
                <span className="text-xs text-muted">{circuits.find((c) => c.id === i.circuitId)?.name ?? "Non affecté"}</span>
              </div>
              {canEdit && (
                <details className="border-t border-line">
                  <summary className="cursor-pointer list-none px-3 py-1.5 text-xs text-muted hover:text-fg marker:hidden">Modifier</summary>
                  <div className="space-y-3 p-3 pt-1">
                    <ItemForm projectId={project.id} circuits={circuits} id={i.id} name={i.name} watts={i.watts} qty={i.qty} circuitId={i.circuitId} />
                    <form action={deleteItem} className="border-t border-line pt-3">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="id" value={i.id} />
                      <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                    </form>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold">Ajouter un appareil</h3>
            <ItemForm projectId={project.id} circuits={circuits} />
          </div>
        )}
      </section>
    </div>
  );
}
