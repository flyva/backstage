import { asc, eq } from "drizzle-orm";
import { AlertTriangle, Trash2, Zap } from "lucide-react";
import { db } from "@/db";
import { powerCircuits, powerItems } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { deleteCircuit, deleteItem, importLightsToPower } from "@/lib/build-actions";
import { VOLTS, circuitLoads, fmtAmps, fmtNum, fmtWatts, phaseLoads } from "@/lib/power";
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
        <div className="card"><div className="text-sm text-muted">Puissance totale</div><div className="text-3xl font-bold tabular-nums">{fmtWatts(totalW)}</div><div className="text-sm text-muted">{fmtAmps(totalW / VOLTS)} A en monophasé</div><div className="mt-1 text-[11px] text-muted tabular-nums">Somme de (quantité × puissance) de tous les appareils : {fmtNum(totalW)} W ÷ {VOLTS} V = {fmtNum(totalW / VOLTS, 2)} A</div></div>
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
                <p className="mt-2 text-[11px] leading-relaxed text-muted tabular-nums">
                  {loads.filter((l) => l.circuit.phase === p.phase).length === 0
                    ? "Aucun circuit sur cette phase."
                    : <>{loads.filter((l) => l.circuit.phase === p.phase).map((l) => `${l.circuit.name} ${fmtNum(l.watts)} W`).join(" + ")} = {fmtNum(p.watts)} W, puis {fmtNum(p.watts)} ÷ {VOLTS} = {fmtNum(p.amps, 2)} A</>}
                </p>
              </li>
            ))}
          </ul>
          {imbalance > 0 && (
            <p className="text-xs text-muted tabular-nums">
              Écart entre phases = (phase la plus chargée − la moins chargée) ÷ la plus chargée = ({fmtNum(maxPhase)} − {fmtNum(minPhase)}) ÷ {fmtNum(maxPhase)} = <strong className="text-fg">{imbalance} %</strong> (au-delà de 25 %, on conseille de rééquilibrer).
            </p>
          )}
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
                <details open className="rounded-xl border border-line bg-bg p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-muted">Voir le calcul</summary>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-muted">
                    <li>
                      <strong className="text-fg">Puissance du circuit</strong> (quantité × puissance de chaque appareil, additionnées) :{" "}
                      {its.length === 0 ? "aucun appareil, 0 W" : <span className="tabular-nums text-fg">{its.map((i) => `${i.qty} × ${fmtNum(i.watts)} W`).join(" + ")}{its.length > 1 || its[0].qty > 1 ? ` = ${its.map((i) => `${fmtNum(i.qty * i.watts)} W`).join(" + ")}` : ""} = <strong>{fmtNum(l.watts)} W</strong></span>}
                    </li>
                    <li>
                      <strong className="text-fg">Intensité</strong> (I = P ÷ U, avec U = {VOLTS} V) : <span className="tabular-nums text-fg">{fmtNum(l.watts)} ÷ {VOLTS} = <strong>{fmtNum(l.amps, 2)} A</strong></span>
                    </li>
                    <li>
                      <strong className="text-fg">Charge du calibre</strong> (intensité ÷ calibre) : <span className="tabular-nums text-fg">{fmtNum(l.amps, 2)} ÷ {l.circuit.breakerAmps} = <strong>{fmtNum(l.pct)} %</strong></span> : {LEVEL_TEXT[l.level]}
                    </li>
                    <li>
                      <strong className="text-fg">Limites de ce circuit</strong> : alerte à 80 % = {fmtNum(l.circuit.breakerAmps * 0.8, 1)} A ({fmtNum(l.circuit.breakerAmps * 0.8 * VOLTS)} W), maximum à 100 % = {l.circuit.breakerAmps} A ({fmtNum(l.circuit.breakerAmps * VOLTS)} W).
                      {l.level === "over" ? ` Il y a ${fmtNum(l.watts - l.circuit.breakerAmps * VOLTS)} W de trop.` : l.level === "warn" ? ` Marge avant 100 % : ${fmtNum(l.circuit.breakerAmps * VOLTS - l.watts)} W.` : ` Marge avant l'alerte : ${fmtNum(l.circuit.breakerAmps * 0.8 * VOLTS - l.watts)} W.`}
                    </li>
                  </ol>
                </details>
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
