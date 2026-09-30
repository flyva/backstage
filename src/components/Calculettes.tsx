"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  SECTIONS, currentOf, dbToPowerRatio, dbToVoltageRatio, delayMs, maxLength, minSection, patchDmx, soundSpeed, splAtDistance, sumDb, voltageDropPct,
  type DmxLine, type Supply,
} from "@/lib/calc";

const num = (v: string) => Number(v.replace(",", "."));
const ok = (n: number) => Number.isFinite(n);
const fmt = (n: number, d = 1) => (ok(n) ? n.toFixed(d).replace(".", ",") : "–");

function Card({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card space-y-3 scroll-mt-20">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, unit, id, step }: { label: string; value: string; onChange: (v: string) => void; unit?: string; id: string; step?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input id={id} inputMode="decimal" step={step} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
    </div>
  );
}

function Result({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const cls = tone === "bad" ? "border-danger text-danger" : tone === "warn" ? "border-amber-500 text-amber-700 dark:text-amber-300" : "border-line";
  return <div className={`rounded-xl border bg-bg p-3 text-sm ${cls}`} role="status">{children}</div>;
}

// ---------- Électricité : intensité et câble ----------

function CableCalc() {
  const [supply, setSupply] = useState<Supply>("mono");
  const [watts, setWatts] = useState("3600");
  const [length, setLength] = useState("50");
  const [section, setSection] = useState("2.5");
  const [limit, setLimit] = useState("3");

  const w = num(watts);
  const L = num(length);
  const S = num(section);
  const lim = num(limit);
  const I = ok(w) ? currentOf(w, supply) : NaN;
  const drop = ok(I) && ok(L) && ok(S) ? voltageDropPct(I, L, S, supply) : NaN;
  const admissible = SECTIONS.find((x) => x.s === S)?.amps ?? NaN;
  const rec = ok(I) && ok(L) && ok(lim) ? minSection(I, L, supply, lim) : null;
  const maxL = ok(I) && ok(S) && ok(lim) ? maxLength(I, S, supply, lim) : NaN;
  const overload = ok(I) && ok(admissible) && I > admissible;
  const tooMuch = ok(drop) && ok(lim) && drop > lim;

  return (
    <Card id="cable" title="Intensité et chute de tension d'un câble" hint="Combien d'ampères, et quelle section de câble pour une longueur donnée ? Cuivre, facteur de puissance 1. Déroule toujours entièrement un enrouleur.">
      <div className="grid gap-3 sm:grid-cols-5">
        <div>
          <label className="label" htmlFor="c-supply">Alimentation</label>
          <select id="c-supply" value={supply} onChange={(e) => setSupply(e.target.value as Supply)} className="input"><option value="mono">Monophasé 230 V</option><option value="tri">Triphasé 400 V</option></select>
        </div>
        <Field id="c-w" label="Puissance" value={watts} onChange={setWatts} unit="W" />
        <Field id="c-l" label="Longueur (aller)" value={length} onChange={setLength} unit="m" />
        <div>
          <label className="label" htmlFor="c-s">Section</label>
          <select id="c-s" value={section} onChange={(e) => setSection(e.target.value)} className="input">{SECTIONS.map((x) => <option key={x.s} value={x.s}>{String(x.s).replace(".", ",")} mm²</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="c-lim">Chute admise</label>
          <select id="c-lim" value={limit} onChange={(e) => setLimit(e.target.value)} className="input"><option value="3">3 % (éclairage)</option><option value="5">5 % (autres usages)</option></select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Result><div className="text-xs text-muted">Intensité</div><div className="text-2xl font-bold tabular-nums">{fmt(I)} A</div></Result>
        <Result tone={tooMuch ? "bad" : "ok"}><div className="text-xs text-muted">Chute de tension avec {String(S).replace(".", ",")} mm²</div><div className="text-2xl font-bold tabular-nums">{fmt(drop, 2)} %</div>{tooMuch && <div className="text-xs">Au-dessus de {limit} %</div>}</Result>
        <Result><div className="text-xs text-muted">Longueur maximale avec cette section</div><div className="text-2xl font-bold tabular-nums">{ok(maxL) ? `${Math.floor(maxL)} m` : "–"}</div></Result>
      </div>
      {overload && <Result tone="bad">L&apos;intensité ({fmt(I)} A) dépasse ce que supporte cette section (environ {admissible} A) : prends une section plus grande ou répartis la charge.</Result>}
      {ok(I) && ok(L) && <Result tone={rec ? "ok" : "bad"}>{rec ? <>Section minimale conseillée : <strong>{String(rec.s).replace(".", ",")} mm²</strong> (jusqu&apos;à environ {rec.amps} A).</> : "Aucune section de la liste ne convient : réduis la longueur ou la charge, ou passe en triphasé."}</Result>}
    </Card>
  );
}

// ---------- DMX ----------

function DmxCalc() {
  const [lines, setLines] = useState<{ name: string; qty: string; footprint: string }[]>([
    { name: "PAR LED", qty: "12", footprint: "8" },
    { name: "Lyre spot", qty: "6", footprint: "24" },
  ]);
  const [gap, setGap] = useState("0");
  const parsed: DmxLine[] = lines.map((l) => ({ name: l.name, qty: Math.floor(num(l.qty)), footprint: Math.floor(num(l.footprint)) }));
  const r = patchDmx(parsed, Math.max(0, Math.floor(num(gap)) || 0));
  const set = (i: number, k: "name" | "qty" | "footprint", v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <Card id="dmx" title="Patch DMX : univers et adresses" hint="Ajoute tes projecteurs (quantité × nombre de canaux). Un projecteur n'est jamais coupé entre deux univers de 512 canaux.">
      <ul className="space-y-2">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[1fr_5rem_5rem_2.5rem] items-end gap-2">
            <div><label className="label" htmlFor={`d-n${i}`}>Projecteur</label><input id={`d-n${i}`} value={l.name} onChange={(e) => set(i, "name", e.target.value)} className="input" /></div>
            <div><label className="label" htmlFor={`d-q${i}`}>Qté</label><input id={`d-q${i}`} inputMode="numeric" value={l.qty} onChange={(e) => set(i, "qty", e.target.value)} className="input" /></div>
            <div><label className="label" htmlFor={`d-f${i}`}>Canaux</label><input id={`d-f${i}`} inputMode="numeric" value={l.footprint} onChange={(e) => set(i, "footprint", e.target.value)} className="input" /></div>
            <button type="button" className="mb-2 p-1 text-muted hover:text-danger" aria-label="Supprimer la ligne" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className="btn-ghost text-xs" onClick={() => setLines((ls) => [...ls, { name: "", qty: "1", footprint: "1" }])}><Plus size={14} /> Ajouter une ligne</button>
        <div className="w-40"><label className="label" htmlFor="d-gap">Canaux libres entre deux projecteurs</label><input id="d-gap" inputMode="numeric" value={gap} onChange={(e) => setGap(e.target.value)} className="input" /></div>
      </div>
      {r.errors.map((e) => <Result key={e} tone="bad">{e}</Result>)}
      {r.rows.length > 0 && (
        <>
          <Result>
            <strong>{r.universes} univers</strong> · {r.channels} canaux utilisés · {r.freeInLast} canaux libres dans le dernier univers
          </Result>
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-sm">
              <thead className="text-xs text-muted"><tr><th className="py-1 text-left font-medium">Projecteur</th><th className="text-right font-medium">Qté × ch</th><th className="text-right font-medium">De</th><th className="text-right font-medium">À</th></tr></thead>
              <tbody className="divide-y divide-line">
                {r.rows.map((row, i) => <tr key={i}><td className="py-1">{row.name}</td><td className="text-right tabular-nums">{row.qty} × {row.footprint}</td><td className="text-right font-mono">{row.from}</td><td className="text-right font-mono">{row.to}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Adresses au format univers.adresse (1.001 = univers 1, canal 1).</p>
        </>
      )}
    </Card>
  );
}

// ---------- Son ----------

function SoundCalc() {
  const [spl1, setSpl1] = useState("100");
  const [d1, setD1] = useState("1");
  const [d2, setD2] = useState("20");
  const [levels, setLevels] = useState("90, 90, 85");
  const [dist, setDist] = useState("18");
  const [temp, setTemp] = useState("20");
  const [db, setDb] = useState("6");

  const at = splAtDistance(num(spl1), num(d1), num(d2));
  const list = levels.split(/[;,\s]+/).map(num).filter(ok);
  const sum = sumDb(list);
  const dl = delayMs(num(dist), num(temp));
  const g = num(db);

  return (
    <Card id="son" title="Son : niveau, somme de sources, délai, décibels" hint="Champ libre, sources non corrélées : des estimations pour préparer une façade, pas une mesure.">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Niveau selon la distance (−6 dB à chaque doublement)</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field id="s-spl" label="Niveau connu" value={spl1} onChange={setSpl1} unit="dB" />
          <Field id="s-d1" label="À la distance" value={d1} onChange={setD1} unit="m" />
          <Field id="s-d2" label="Niveau à" value={d2} onChange={setD2} unit="m" />
          <Result><div className="text-xs text-muted">Résultat</div><div className="text-2xl font-bold tabular-nums">{fmt(at)} dB</div></Result>
        </div>
      </div>
      <div className="space-y-2 border-t border-line pt-3">
        <h3 className="text-sm font-medium">Somme de sources (dB)</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-3"><label className="label" htmlFor="s-lv">Niveaux séparés par des virgules</label><input id="s-lv" value={levels} onChange={(e) => setLevels(e.target.value)} className="input" /></div>
          <Result><div className="text-xs text-muted">Total ({list.length} sources)</div><div className="text-2xl font-bold tabular-nums">{fmt(sum)} dB</div></Result>
        </div>
        <p className="text-xs text-muted">Deux sources identiques donnent +3 dB ; dix sources identiques +10 dB.</p>
      </div>
      <div className="space-y-2 border-t border-line pt-3">
        <h3 className="text-sm font-medium">Délai d&apos;une enceinte (alignement sur la façade)</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field id="s-dist" label="Distance à la façade" value={dist} onChange={setDist} unit="m" />
          <Field id="s-temp" label="Température" value={temp} onChange={setTemp} unit="°C" />
          <Result><div className="text-xs text-muted">Délai</div><div className="text-2xl font-bold tabular-nums">{fmt(dl)} ms</div></Result>
          <Result><div className="text-xs text-muted">Vitesse du son</div><div className="text-2xl font-bold tabular-nums">{fmt(soundSpeed(num(temp)), 0)} m/s</div></Result>
        </div>
      </div>
      <div className="space-y-2 border-t border-line pt-3">
        <h3 className="text-sm font-medium">Décibels et rapports</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="s-db" label="Gain" value={db} onChange={setDb} unit="dB" />
          <Result><div className="text-xs text-muted">Tension (×)</div><div className="text-xl font-bold tabular-nums">{ok(g) ? dbToVoltageRatio(g).toFixed(2).replace(".", ",") : "–"}</div></Result>
          <Result><div className="text-xs text-muted">Puissance (×)</div><div className="text-xl font-bold tabular-nums">{ok(g) ? dbToPowerRatio(g).toFixed(2).replace(".", ",") : "–"}</div></Result>
        </div>
      </div>
    </Card>
  );
}

export function Calculettes() {
  return (
    <div className="space-y-6">
      <nav aria-label="Calculettes" className="flex flex-wrap gap-2 text-sm">
        <a href="#cable" className="btn-ghost text-xs">Câble et chute de tension</a>
        <a href="#dmx" className="btn-ghost text-xs">Patch DMX</a>
        <a href="#son" className="btn-ghost text-xs">Son et décibels</a>
      </nav>
      <CableCalc />
      <DmxCalc />
      <SoundCalc />
    </div>
  );
}
