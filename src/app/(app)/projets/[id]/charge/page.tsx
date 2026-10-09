import { asc, eq } from "drizzle-orm";
import { AlertTriangle, Trash2, Zap } from "lucide-react";
import { db } from "@/db";
import { powerCircuits, powerItems } from "@/db/schema";
import { can, requireProject } from "@/lib/projects";
import { deleteCircuit, deleteItem, importLightsToPower } from "@/lib/build-actions";
import { OUTLET_FILL, VOLTS, fmtNum, fmtWatts, lineResult, type LineResult } from "@/lib/power";
import { ItemForm, LineForm } from "@/components/build-forms";
import { OhmCalc, OutletsCalc } from "@/components/Calculettes";

export const metadata = { title: "Charge électrique" };

const LEVEL_CLASS = { ok: "bg-emerald-500", warn: "bg-amber-500", over: "bg-danger" } as const;
const LEVEL_TEXT = { ok: "OK", warn: "Charge élevée (> 80 %)", over: "Surcharge" } as const;
const levelOf = (pct: number) => (pct > 100 ? "over" : pct > 80 ? "warn" : "ok") as keyof typeof LEVEL_CLASS;
const outletAmps = (r: LineResult) => r.circuit.outletAmps ?? 16;
const groupsText = (r: { groups: { qty: number; name: string }[] }) => r.groups.map((g) => `${g.qty} × ${g.name}`).join(" + ");

function Bar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full ${LEVEL_CLASS[levelOf(pct)]}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

/** Le détail du calcul d'une ligne : chaque étape avec sa formule et les chiffres. */
function Detail({ r }: { r: LineResult }) {
  const tetra = r.mode === "tetra";
  const cal = r.circuit.breakerAmps;
  const used = r.phases.filter((p) => p.watts > 0);
  const avgAmps = r.watts / VOLTS / r.phases.length;
  // Lignes du calcul des prises : par départ et par phase si la ligne est divisée, sinon par phase.
  const outletRows = r.feeders.length > 0
    ? r.feeders.flatMap((fd) => fd.phases.filter((ph) => ph.groups.length > 0).map((ph) => ({ key: `${fd.index}-${ph.phase}`, label: `Départ ${fd.index}${tetra ? ` · L${ph.phase}` : ""}`, amps: ph.amps, outlets: ph.outlets, min: Math.ceil(ph.amps / (outletAmps(r) * OUTLET_FILL) - 1e-9) })))
    : r.phases.map((p) => ({ key: String(p.phase), label: tetra ? `L${p.phase}` : "", amps: p.amps, outlets: p.outlets, min: p.outletsMin }));
  return (
    <details open className="rounded-xl border border-line bg-bg p-3 text-xs">
      <summary className="cursor-pointer font-medium text-muted">Voir le détail du calcul</summary>
      <ol className="mt-2 list-decimal space-y-2.5 pl-4 leading-relaxed text-muted tabular-nums">
        <li>
          <strong className="text-fg">Capacité de la ligne</strong> : P = U × I.
          {" "}{tetra ? `Chaque phase peut porter ${cal} A, soit ${r.capacityAmps} A au total (3 × ${cal}).` : `La ligne peut porter ${cal} A.`}{" "}
          Puissance maximale : {VOLTS} V × {r.capacityAmps} A = <strong className="text-fg">{fmtNum(r.capacityWatts)} W</strong>.
        </li>
        {tetra && (
          <li>
            <strong className="text-fg">Répartition sur les phases</strong> (automatique) : les appareils sont posés un par un, du plus gros au plus petit, sur la phase la moins chargée.
            <ul className="mt-1 space-y-0.5">
              {r.phases.map((p) => <li key={p.phase}>L{p.phase} : {p.groups.length ? groupsText(p) : "aucun appareil"}</li>)}
            </ul>
          </li>
        )}
        <li>
          <strong className="text-fg">Puissance{tetra ? " de chaque phase" : ""}</strong> : P = somme de (quantité × watts).
          <ul className="mt-1 space-y-0.5">
            {r.phases.map((p) => (
              <li key={p.phase}>{tetra ? `L${p.phase} : ` : ""}{p.groups.length ? `${p.groups.map((g) => `${g.qty} × ${fmtNum(g.watts)} W`).join(" + ")} = ` : ""}<strong className="text-fg">{fmtNum(p.watts)} W</strong></li>
            ))}
          </ul>
        </li>
        <li>
          <strong className="text-fg">Intensité</strong> : I = P ÷ U, avec U = {VOLTS} V{tetra ? " (entre une phase et le neutre)" : ""}.
          <ul className="mt-1 space-y-0.5">
            {r.phases.map((p) => <li key={p.phase}>{tetra ? `L${p.phase} : ` : ""}{fmtNum(p.watts)} ÷ {VOLTS} = <strong className="text-fg">{fmtNum(p.amps, 2)} A</strong></li>)}
          </ul>
        </li>
        <li>
          <strong className="text-fg">Résistance équivalente</strong> : R = U ÷ I (loi d&apos;Ohm).
          <ul className="mt-1 space-y-0.5">
            {r.phases.map((p) => <li key={p.phase}>{tetra ? `L${p.phase} : ` : ""}{p.amps > 0 ? <>{VOLTS} ÷ {fmtNum(p.amps, 2)} = <strong className="text-fg">{fmtNum(VOLTS / p.amps, 1)} Ω</strong></> : "aucune charge (résistance infinie)"}</li>)}
          </ul>
        </li>
        <li>
          <strong className="text-fg">Contrôle</strong> : P = U × I.
          <ul className="mt-1 space-y-0.5">
            {used.length === 0 ? <li>Aucune puissance à contrôler.</li> : used.map((p) => <li key={p.phase}>{tetra ? `L${p.phase} : ` : ""}{VOLTS} × {fmtNum(p.amps, 2)} = {fmtNum(VOLTS * p.amps)} W ✓</li>)}
          </ul>
        </li>
        <li>
          <strong className="text-fg">Charge du calibre</strong> : I ÷ calibre.
          <ul className="mt-1 space-y-0.5">
            {r.phases.map((p) => <li key={p.phase}>{tetra ? `L${p.phase} : ` : ""}{fmtNum(p.amps, 2)} ÷ {cal} = <strong className="text-fg">{fmtNum(p.pct)} %</strong> : {LEVEL_TEXT[levelOf(p.pct)]}</li>)}
          </ul>
          Alerte à 80 % = {fmtNum(cal * 0.8, 1)} A ({fmtNum(cal * 0.8 * VOLTS)} W{tetra ? " par phase" : ""}), maximum à 100 % = {cal} A ({fmtNum(cal * VOLTS)} W{tetra ? " par phase" : ""}).
        </li>
        {r.feederAmps && (
          <li>
            <strong className="text-fg">Division en départs de {r.feederAmps} A</strong> : un départ est rempli jusqu&apos;à 80 % de son calibre, soit {r.feederAmps} × 0,8 = {fmtNum(r.feederAmps * 0.8, 1)} A par phase.
            Nombre de départs = intensité de la phase la plus chargée ÷ {fmtNum(r.feederAmps * 0.8, 1)}, arrondi au-dessus : {fmtNum(Math.max(...r.phases.map((p) => p.amps)), 2)} ÷ {fmtNum(r.feederAmps * 0.8, 1)} = {fmtNum(Math.max(...r.phases.map((p) => p.amps)) / (r.feederAmps * 0.8), 2)} → <strong className="text-fg">{r.feedersMin} départ{r.feedersMin > 1 ? "s" : ""}</strong>.
            Sur chaque phase, les appareils sont répartis entre les départs, toujours sur le moins chargé.
            <ul className="mt-1 space-y-0.5">
              {r.feeders.map((fd) => (
                <li key={fd.index}>Départ {fd.index} : {fd.phases.map((ph) => `${tetra ? `L${ph.phase} ` : ""}${fmtNum(ph.amps, 2)} A`).join(" ; ")} (sur {r.feederAmps} A)</li>
              ))}
            </ul>
            Contrôle : sur chaque phase, la somme des départs ({fmtNum(Math.max(...r.phases.map((p) => p.amps)), 2)} A au plus) doit rester sous le calibre de la ligne ({r.circuit.breakerAmps} A) : {Math.max(...r.phases.map((p) => p.amps)) <= r.circuit.breakerAmps ? "✓" : "dépassé"}.
          </li>
        )}
        <li>
          <strong className="text-fg">Prises de courant {outletAmps(r)} A{r.feeders.length > 0 ? " (par départ et par phase)" : tetra ? " (par phase)" : ""}</strong> : une prise est remplie jusqu&apos;à 80 % de son calibre, soit {outletAmps(r)} × {fmtNum(OUTLET_FILL, 1)} = {fmtNum(outletAmps(r) * OUTLET_FILL, 1)} A ({fmtNum(outletAmps(r) * OUTLET_FILL * VOLTS)} W).
          Nombre minimum de prises = I ÷ {fmtNum(outletAmps(r) * OUTLET_FILL, 1)}, arrondi au-dessus. Les appareils sont placés du plus gros au plus petit dans la première prise où ils tiennent.
          <ul className="mt-1 space-y-1.5">
            {outletRows.map((p) => (
              <li key={p.key}>
                {p.label ? `${p.label} : ` : ""}{fmtNum(p.amps, 2)} ÷ {fmtNum(outletAmps(r) * OUTLET_FILL, 1)} = {fmtNum(p.amps / (outletAmps(r) * OUTLET_FILL), 2)} → <strong className="text-fg">{p.min} prise{p.min > 1 ? "s" : ""} minimum</strong>{p.outlets.length > p.min ? ` (${p.outlets.length} avec le rangement réel des appareils)` : ""}
                <ul className="ml-3 mt-0.5 list-disc space-y-0.5">
                  {p.outlets.map((o) => (
                    <li key={o.index}>Prise {o.index} : {o.groups.map((g) => `${g.qty} × ${fmtNum(g.watts)} W`).join(" + ")} = {fmtNum(o.watts)} W ; {fmtNum(o.watts)} ÷ {VOLTS} = {fmtNum(o.amps, 2)} A ; {fmtNum(o.amps, 2)} ÷ {outletAmps(r)} = <strong className="text-fg">{fmtNum(o.pct)} %</strong>{o.pct > 100 ? " : dépasse la prise, utilise une prise plus forte" : ""}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
        {tetra && (
          <>
            <li>
              <strong className="text-fg">Courant dans le neutre</strong> : In = √(I1² + I2² + I3² − I1·I2 − I2·I3 − I3·I1) = √({r.phases.map((p) => `${fmtNum(p.amps, 2)}²`).join(" + ")} − {fmtNum(r.phases[0].amps, 2)}×{fmtNum(r.phases[1].amps, 2)} − {fmtNum(r.phases[1].amps, 2)}×{fmtNum(r.phases[2].amps, 2)} − {fmtNum(r.phases[2].amps, 2)}×{fmtNum(r.phases[0].amps, 2)}) = <strong className="text-fg">{fmtNum(r.neutral, 2)} A</strong>.
              Les phases égales s&apos;annulent dans le neutre. Avec des gradateurs et des LED, il peut porter plus : son câble doit être au moins aussi gros que ceux des phases.
            </li>
            <li>
              <strong className="text-fg">Vérification triphasée</strong> : si les 3 phases étaient parfaitement égales, P = √3 × 400 × I, donc I = {fmtNum(r.watts)} ÷ (1,732 × 400) = <strong className="text-fg">{fmtNum(r.watts / (Math.sqrt(3) * 400), 2)} A</strong> par phase (contre {fmtNum(avgAmps, 2)} A en moyenne ici, {fmtNum(Math.max(...r.phases.map((p) => p.amps)), 2)} A sur la plus chargée).
            </li>
          </>
        )}
      </ol>
    </details>
  );
}

export default async function PowerPage({ params }: PageProps<"/projets/[id]/charge">) {
  const { id } = await params;
  const { project, role } = await requireProject(Number(id));
  const canEdit = can(role, "editor");

  const [circuits, items] = await Promise.all([
    db.select().from(powerCircuits).where(eq(powerCircuits.projectId, project.id)).orderBy(asc(powerCircuits.position), asc(powerCircuits.id)),
    db.select().from(powerItems).where(eq(powerItems.projectId, project.id)).orderBy(asc(powerItems.name), asc(powerItems.id)),
  ]);
  const lines = circuits.map((c) => lineResult(c, items));
  const totalW = items.reduce((s, i) => s + i.watts * i.qty, 0);
  const unassigned = items.filter((i) => i.circuitId === null);
  const problems = lines.filter((l) => l.level !== "ok").length;

  return (
    <div className="space-y-6">
      <section className="card space-y-2 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Zap size={16} className="text-accent" /> Comment ça marche</h2>
        <p className="text-muted">
          Une <strong className="text-fg">ligne</strong> est une alimentation : tu choisis son ampérage (16, 32, 63 ou 125 A) et son type (monophasé ou tétraphasé 3 phases + neutre).
          Mets tes projecteurs et appareils sur une ligne : Backstage les répartit tout seul sur les phases et calcule la charge, avec le détail.
        </p>
        <p className="text-xs text-muted tabular-nums">
          Formules : <strong className="text-fg">P = U × I</strong> (puissance en W = tension en V × intensité en A), donc <strong className="text-fg">I = P ÷ U</strong> ;
          <strong className="text-fg"> R = U ÷ I</strong> (résistance en Ω, loi d&apos;Ohm). U = {VOLTS} V entre une phase et le neutre (400 V entre deux phases). Estimation avec un facteur de puissance de 1.
        </p>
      </section>

      <details className="card space-y-4">
        <summary className="cursor-pointer font-semibold">Calculettes rapides : P = U × I, R = U ÷ I et prises par phase</summary>
        <div className="space-y-6 pt-3">
          <div className="space-y-3"><h3 className="text-sm font-semibold text-muted">Loi d&apos;Ohm</h3><OhmCalc /></div>
          <div className="space-y-3 border-t border-line pt-5"><h3 className="text-sm font-semibold text-muted">Prises de courant par phase</h3><OutletsCalc /></div>
        </div>
      </details>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-sm text-muted">Puissance totale</div><div className="text-3xl font-bold tabular-nums">{fmtWatts(totalW)}</div><div className="text-[11px] text-muted tabular-nums">Somme de (quantité × watts) de tous les appareils</div></div>
        <div className="card"><div className="text-sm text-muted">Lignes</div><div className="text-3xl font-bold tabular-nums">{lines.length}</div><div className={`text-sm ${problems ? "font-medium text-danger" : "text-muted"}`}>{problems ? `${problems} à vérifier` : "Tout est dans la limite"}</div></div>
        <div className="card"><div className="text-sm text-muted">Non affecté</div><div className="text-3xl font-bold tabular-nums">{fmtWatts(unassigned.reduce((s, i) => s + i.watts * i.qty, 0))}</div><div className="text-sm text-muted">{unassigned.length} appareil(s) sans ligne</div></div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Lignes</h2>
        {lines.length === 0 && <p className="text-sm text-muted">Crée une ligne (par exemple « Ligne scène », 32 A tétraphasé), puis mets-y tes appareils.</p>}
        {lines.map((r) => {
          const tetra = r.mode === "tetra";
          return (
            <div key={r.circuit.id} className="card space-y-3 p-0">
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-lg font-semibold">{r.circuit.name}</h3>
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{r.circuit.breakerAmps} A · {tetra ? "Tétraphasé" : "Monophasé"}</span>
                  <span className="ml-auto text-sm tabular-nums">{fmtWatts(r.watts)} sur {fmtWatts(r.capacityWatts)}</span>
                </div>

                <ul className="space-y-2">
                  {r.phases.map((p) => (
                    <li key={p.phase} className="space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <span className="font-medium">{tetra ? `Phase L${p.phase}` : "Ligne"}</span>
                        <span className="tabular-nums text-muted">{fmtNum(p.watts)} W · {fmtNum(p.amps, 2)} A ÷ {r.circuit.breakerAmps} A = <strong className="text-fg">{fmtNum(p.pct)} %</strong></span>
                      </div>
                      <Bar pct={p.pct} label={`Charge de ${r.circuit.name}${tetra ? ` L${p.phase}` : ""}`} />
                      {p.groups.length > 0 && <p className="text-xs text-muted">{groupsText(p)}</p>}
                      {p.outlets.length > 0 && r.feeders.length === 0 && (
                        <div className="space-y-1 pt-0.5">
                          <p className="text-xs font-medium text-fg">{p.outlets.length} prise{p.outlets.length > 1 ? "s" : ""} de {outletAmps(r)} A{tetra ? ` sur L${p.phase}` : ""}</p>
                          <ul className="grid gap-1 sm:grid-cols-2">
                            {p.outlets.map((o) => (
                              <li key={o.index} className="rounded-lg border border-line bg-bg px-2 py-1.5 text-xs">
                                <div className="flex flex-wrap justify-between gap-x-2 tabular-nums">
                                  <span className="font-medium">Prise {o.index}</span>
                                  <span className="text-muted">{fmtNum(o.watts)} W · {fmtNum(o.amps, 2)} A ÷ {outletAmps(r)} A = <strong className={o.pct > 100 ? "text-danger" : o.pct > 80 ? "text-amber-600 dark:text-amber-400" : "text-fg"}>{fmtNum(o.pct)} %</strong></span>
                                </div>
                                <div className="text-muted">{groupsText(o)}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {r.feederAmps && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Répartition : {r.circuit.breakerAmps} A divisé en {r.feeders.length} départ{r.feeders.length > 1 ? "s" : ""} de {r.feederAmps} A</h4>
                    {r.feeders.length === 0 && <p className="text-xs text-muted">Aucun appareil à répartir.</p>}
                    {r.feeders.map((fd) => (
                      <div key={fd.index} className="space-y-2 rounded-xl border border-line bg-bg p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                          <span className="font-medium">Départ {fd.index} · {r.feederAmps} A {tetra ? "tétra" : "mono"}</span>
                          <span className="tabular-nums text-muted">{fmtWatts(fd.watts)} · phase la plus chargée à <strong className={fd.maxPct > 100 ? "text-danger" : fd.maxPct > 80 ? "text-amber-600 dark:text-amber-400" : "text-fg"}>{fmtNum(fd.maxPct)} %</strong></span>
                        </div>
                        <ul className="space-y-2">
                          {fd.phases.filter((ph) => ph.groups.length > 0).map((ph) => (
                            <li key={ph.phase} className="space-y-1 text-xs">
                              <div className="tabular-nums text-muted"><span className="font-medium text-fg">{tetra ? `Phase L${ph.phase}` : "Départ"}</span> : {fmtNum(ph.watts)} W · {fmtNum(ph.amps, 2)} A ÷ {r.feederAmps} A = {fmtNum(ph.pct)} %</div>
                              <ul className="grid gap-1 sm:grid-cols-2">
                                {ph.outlets.map((o) => (
                                  <li key={o.index} className="rounded-lg border border-line px-2 py-1.5">
                                    <div className="flex flex-wrap justify-between gap-x-2 tabular-nums"><span className="font-medium">Prise {o.index}{tetra ? ` (L${ph.phase})` : ""}</span><span className="text-muted">{fmtNum(o.watts)} W · {fmtNum(o.amps, 2)} A · <strong className={o.pct > 100 ? "text-danger" : o.pct > 80 ? "text-amber-600 dark:text-amber-400" : "text-fg"}>{fmtNum(o.pct)} %</strong> de {outletAmps(r)} A</span></div>
                                    <div className="text-muted">{groupsText(o)}</div>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {tetra && <p className="text-xs text-muted tabular-nums">Courant dans le neutre : {fmtNum(r.neutral, 2)} A</p>}
                {r.level !== "ok" && <p className={`flex items-center gap-1 text-sm font-medium ${r.level === "over" ? "text-danger" : "text-amber-600 dark:text-amber-400"}`}><AlertTriangle size={14} /> {LEVEL_TEXT[r.level]}</p>}
                {r.watts === 0 && <p className="text-xs text-muted">Aucun appareil sur cette ligne : choisis cette ligne dans la fiche d&apos;un appareil ci-dessous.</p>}

                <Detail r={r} />
              </div>
              {canEdit && (
                <details className="border-t border-line">
                  <summary className="cursor-pointer list-none px-4 py-2 text-xs text-muted hover:text-fg marker:hidden">Modifier la ligne</summary>
                  <div className="space-y-3 p-4 pt-1">
                    <LineForm projectId={project.id} id={r.circuit.id} name={r.circuit.name} breakerAmps={r.circuit.breakerAmps} mode={r.mode} outletAmps={outletAmps(r)} feederAmps={r.feederAmps} />
                    <form action={deleteCircuit} className="border-t border-line pt-3">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="id" value={r.circuit.id} />
                      <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer (les appareils restent, sans ligne)</button>
                    </form>
                  </div>
                </details>
              )}
            </div>
          );
        })}
        {canEdit && (
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold">Ajouter une ligne</h3>
            <LineForm projectId={project.id} />
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
                <span className="text-xs text-muted">{circuits.find((c) => c.id === i.circuitId)?.name ?? "Sans ligne"}</span>
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
