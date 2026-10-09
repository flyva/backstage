"use client";

import { useState } from "react";
import { Plus, Sigma, Trash2 } from "lucide-react";
import {
  RHO_CU, SECTIONS, currentOf, outletsFor, solveOhm, dbToPowerRatio, dbToVoltageRatio, delayMs, maxLength, minSection, patchDmx, soundSpeed, splAtDistance, sumDb, voltageDropPct,
  type DmxLine, type Supply,
} from "@/lib/calc";

const num = (v: string) => Number(v.replace(",", "."));
const ok = (n: number) => Number.isFinite(n);
const f = (n: number, d = 1) => (ok(n) ? n.toFixed(d).replace(".", ",") : "–");

const TABS = [
  { id: "ohm", label: "Loi d'Ohm (P, U, I, R)" },
  { id: "prises", label: "Prises par phase" },
  { id: "cable", label: "Câble" },
  { id: "dmx", label: "Patch DMX" },
  { id: "distance", label: "Niveau et distance" },
  { id: "somme", label: "Somme de sources" },
  { id: "delai", label: "Délai d'enceinte" },
  { id: "db", label: "Décibels" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Field({ id, label, value, onChange, unit }: { id: string; label: string; value: string; onChange: (v: string) => void; unit?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="input" />
        {unit && <span className="w-8 shrink-0 text-sm text-muted">{unit}</span>}
      </div>
    </div>
  );
}

function Big({ label, value, tone }: { label: string; value: string; tone?: "bad" | "warn" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "bad" ? "border-danger" : tone === "warn" ? "border-amber-500" : "border-line"}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-3xl font-bold tabular-nums ${tone === "bad" ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}

/** Bouton « Voir le calcul » : déplie les étapes avec les valeurs saisies. */
function Steps({ lines }: { lines: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="btn-ghost text-xs" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Sigma size={14} /> {open ? "Masquer le calcul" : "Voir le calcul"}</button>
      {open && (
        <ol className="mt-2 space-y-1.5 rounded-xl border border-line bg-bg p-4 font-mono text-[13px] leading-relaxed">
          {lines.map((l, i) => <li key={i} className={l.startsWith("→") ? "font-semibold" : "text-muted"}>{l}</li>)}
        </ol>
      )}
    </div>
  );
}

function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "bad" }) {
  return <p className={`text-sm ${tone === "bad" ? "text-danger" : "text-muted"}`} role="status">{children}</p>;
}

// ---------- Câble ----------

function CableCalc() {
  const [supply, setSupply] = useState<Supply>("mono");
  const [watts, setWatts] = useState("3600");
  const [length, setLength] = useState("50");
  const [section, setSection] = useState("2.5");
  const [limit, setLimit] = useState("3");
  const w = num(watts), L = num(length), S = num(section), lim = num(limit);
  const I = ok(w) ? currentOf(w, supply) : NaN;
  const drop = ok(I) && ok(L) ? voltageDropPct(I, L, S, supply) : NaN;
  const adm = SECTIONS.find((x) => x.s === S)?.amps ?? NaN;
  const rec = ok(I) && ok(L) ? minSection(I, L, supply, lim) : null;
  const maxL = ok(I) ? maxLength(I, S, supply, lim) : NaN;
  const U = supply === "mono" ? 230 : 400;
  const k = supply === "mono" ? "2" : "√3";
  const kv = supply === "mono" ? 2 : Math.sqrt(3);
  const dropV = ok(I) && ok(L) ? (kv * RHO_CU * L * I) / S : NaN;
  const bad = ok(drop) && drop > lim;
  const over = ok(I) && ok(adm) && I > adm;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="c-supply">Alimentation</label>
          <select id="c-supply" value={supply} onChange={(e) => setSupply(e.target.value as Supply)} className="input"><option value="mono">Monophasé 230 V</option><option value="tri">Triphasé 400 V</option></select>
        </div>
        <Field id="c-w" label="Puissance" value={watts} onChange={setWatts} unit="W" />
        <Field id="c-l" label="Longueur (aller)" value={length} onChange={setLength} unit="m" />
        <div>
          <label className="label" htmlFor="c-s">Section du câble</label>
          <select id="c-s" value={section} onChange={(e) => setSection(e.target.value)} className="input">{SECTIONS.map((x) => <option key={x.s} value={x.s}>{String(x.s).replace(".", ",")} mm²</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="c-lim">Chute admise</label>
          <select id="c-lim" value={limit} onChange={(e) => setLimit(e.target.value)} className="input"><option value="3">3 % (éclairage)</option><option value="5">5 % (autres usages)</option></select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Big label="Intensité" value={`${f(I)} A`} tone={over ? "bad" : undefined} />
        <Big label="Chute de tension" value={`${f(drop, 2)} %`} tone={bad ? "bad" : undefined} />
        <Big label="Longueur maximale" value={ok(maxL) ? `${Math.floor(maxL)} m` : "–"} />
      </div>
      {over && <Note tone="bad">{f(I)} A dépasse ce que supporte cette section (environ {adm} A).</Note>}
      {ok(I) && ok(L) && (rec ? <Note>Section minimale conseillée : <strong className="text-fg">{String(rec.s).replace(".", ",")} mm²</strong>.</Note> : <Note tone="bad">Aucune section de la liste ne convient : réduis la longueur ou la charge.</Note>)}

      <Steps lines={[
        `1. Intensité : I = P ÷ ${supply === "mono" ? "U" : "(√3 × U)"} = ${f(w, 0)} ÷ ${supply === "mono" ? U : `(1,732 × ${U})`}`,
        `→ I = ${f(I, 2)} A`,
        `2. Chute de tension : ΔU = ${k} × ρ × L × I ÷ S  (ρ = ${String(RHO_CU).replace(".", ",")} Ω·mm²/m, cuivre)`,
        `   ΔU = ${k} × ${String(RHO_CU).replace(".", ",")} × ${f(L, 0)} × ${f(I, 2)} ÷ ${f(S, 1)} = ${f(dropV, 2)} V`,
        `→ ${f(dropV, 2)} ÷ ${U} × 100 = ${f(drop, 2)} %`,
        `3. Longueur maximale : L = (${f(lim, 0)} % × ${U} × S) ÷ (${k} × ρ × I)`,
        `→ L max = ${ok(maxL) ? f(maxL, 1) : "–"} m`,
      ]} />
    </div>
  );
}

// ---------- DMX ----------

function DmxCalc() {
  const [lines, setLines] = useState([{ name: "PAR LED", qty: "12", footprint: "8" }, { name: "Lyre spot", qty: "6", footprint: "24" }]);
  const [gap, setGap] = useState("0");
  const parsed: DmxLine[] = lines.map((l) => ({ name: l.name, qty: Math.floor(num(l.qty)), footprint: Math.floor(num(l.footprint)) }));
  const g = Math.max(0, Math.floor(num(gap)) || 0);
  const r = patchDmx(parsed, g);
  const set = (i: number, k: "name" | "qty" | "footprint", v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[1fr_5rem_5rem_2rem] items-end gap-2">
            <div><label className="label" htmlFor={`d-n${i}`}>Projecteur</label><input id={`d-n${i}`} value={l.name} onChange={(e) => set(i, "name", e.target.value)} className="input" /></div>
            <div><label className="label" htmlFor={`d-q${i}`}>Qté</label><input id={`d-q${i}`} inputMode="numeric" value={l.qty} onChange={(e) => set(i, "qty", e.target.value)} className="input" /></div>
            <div><label className="label" htmlFor={`d-f${i}`}>Canaux</label><input id={`d-f${i}`} inputMode="numeric" value={l.footprint} onChange={(e) => set(i, "footprint", e.target.value)} className="input" /></div>
            <button type="button" className="mb-2 p-1 text-muted hover:text-danger" aria-label="Supprimer la ligne" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-4">
        <button type="button" className="btn-ghost text-xs" onClick={() => setLines((ls) => [...ls, { name: "", qty: "1", footprint: "1" }])}><Plus size={14} /> Ajouter une ligne</button>
        <div className="w-44"><Field id="d-gap" label="Canaux libres entre projecteurs" value={gap} onChange={setGap} /></div>
      </div>

      {r.errors.map((e) => <Note key={e} tone="bad">{e}</Note>)}
      {r.rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Big label="Univers nécessaires" value={String(r.universes)} />
            <Big label="Canaux utilisés" value={String(r.channels)} />
            <Big label="Libres dans le dernier" value={String(r.freeInLast)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-sm">
              <thead className="text-xs text-muted"><tr><th className="py-1 text-left font-medium">Projecteur</th><th className="text-right font-medium">Qté × canaux</th><th className="text-right font-medium">De</th><th className="text-right font-medium">À</th></tr></thead>
              <tbody className="divide-y divide-line">{r.rows.map((row, i) => <tr key={i}><td className="py-1.5">{row.name}</td><td className="text-right tabular-nums">{row.qty} × {row.footprint}</td><td className="text-right font-mono">{row.from}</td><td className="text-right font-mono">{row.to}</td></tr>)}</tbody>
            </table>
          </div>
          <Steps lines={[
            "1. Chaque projecteur occupe autant de canaux que son mode DMX, à la suite du précédent.",
            ...r.rows.map((row) => `   ${row.qty} × ${row.name} (${row.footprint} ch) = ${row.qty * row.footprint} canaux : de ${row.from} à ${row.to}`),
            "2. Un univers contient 512 canaux : si un projecteur ne tient pas en entier, il passe au début de l'univers suivant.",
            `→ ${r.channels} canaux utilisés sur ${r.universes} univers (${r.universes} × 512 = ${r.universes * 512}), ${r.freeInLast} libres dans le dernier`,
            "   Adresses au format univers.adresse : 1.001 = univers 1, canal 1.",
          ]} />
        </>
      )}
    </div>
  );
}

// ---------- Son ----------

function DistanceCalc() {
  const [spl, setSpl] = useState("100"); const [d1, setD1] = useState("1"); const [d2, setD2] = useState("20");
  const res = splAtDistance(num(spl), num(d1), num(d2));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="s-spl" label="Niveau connu" value={spl} onChange={setSpl} unit="dB" />
        <Field id="s-d1" label="À la distance" value={d1} onChange={setD1} unit="m" />
        <Field id="s-d2" label="Niveau voulu à" value={d2} onChange={setD2} unit="m" />
      </div>
      <Big label={`Niveau à ${f(num(d2), 0)} m`} value={`${f(res)} dB`} />
      <Steps lines={[
        "Champ libre : le niveau baisse de 6 dB à chaque doublement de la distance.",
        `1. Rapport de distances : ${f(num(d2), 0)} ÷ ${f(num(d1), 0)} = ${f(num(d2) / num(d1), 2)}`,
        `2. Baisse : 20 × log10(${f(num(d2) / num(d1), 2)}) = ${f(20 * Math.log10(num(d2) / num(d1)), 1)} dB`,
        `→ ${f(num(spl), 1)} − ${f(20 * Math.log10(num(d2) / num(d1)), 1)} = ${f(res)} dB`,
      ]} />
    </div>
  );
}

function SumCalc() {
  const [levels, setLevels] = useState("90, 90, 85");
  const list = levels.split(/[;,\s]+/).map(num).filter(ok);
  const total = sumDb(list);
  return (
    <div className="space-y-5">
      <div><label className="label" htmlFor="s-lv">Niveaux des sources (dB), séparés par des virgules</label><input id="s-lv" value={levels} onChange={(e) => setLevels(e.target.value)} className="input max-w-md" /></div>
      <Big label={`Total de ${list.length} source${list.length > 1 ? "s" : ""}`} value={`${f(total)} dB`} />
      <Note>Deux sources identiques donnent +3 dB ; dix sources identiques +10 dB.</Note>
      <Steps lines={[
        "Les niveaux ne s'additionnent pas directement : on additionne les puissances.",
        ...list.map((l) => `   10^(${f(l, 1)} ÷ 10) = ${(10 ** (l / 10)).toExponential(2).replace(".", ",")}`),
        `1. Somme des puissances = ${list.reduce((s, l) => s + 10 ** (l / 10), 0).toExponential(3).replace(".", ",")}`,
        `→ Total = 10 × log10(somme) = ${f(total, 2)} dB`,
      ]} />
    </div>
  );
}

function DelayCalc() {
  const [dist, setDist] = useState("18"); const [temp, setTemp] = useState("20");
  const c = soundSpeed(num(temp));
  const d = delayMs(num(dist), num(temp));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="s-dist" label="Distance à la façade" value={dist} onChange={setDist} unit="m" />
        <Field id="s-temp" label="Température" value={temp} onChange={setTemp} unit="°C" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Big label="Délai à régler" value={`${f(d)} ms`} />
        <Big label="Vitesse du son" value={`${f(c, 0)} m/s`} />
      </div>
      <Steps lines={[
        `1. Vitesse du son : c = 331,3 + 0,606 × T = 331,3 + 0,606 × ${f(num(temp), 0)} = ${f(c, 1)} m/s`,
        `2. Temps de trajet : t = d ÷ c = ${f(num(dist), 1)} ÷ ${f(c, 1)} = ${(num(dist) / c).toFixed(4).replace(".", ",")} s`,
        `→ Délai = ${f(d, 1)} ms`,
      ]} />
    </div>
  );
}

function DbCalc() {
  const [db, setDb] = useState("6");
  const g = num(db);
  return (
    <div className="space-y-5">
      <div className="max-w-xs"><Field id="s-db" label="Gain" value={db} onChange={setDb} unit="dB" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Big label="Rapport de tension" value={ok(g) ? `× ${f(dbToVoltageRatio(g), 2)}` : "–"} />
        <Big label="Rapport de puissance" value={ok(g) ? `× ${f(dbToPowerRatio(g), 2)}` : "–"} />
      </div>
      <Steps lines={[
        `1. Tension : 10^(dB ÷ 20) = 10^(${f(g, 1)} ÷ 20) = ${f(dbToVoltageRatio(g), 3)}`,
        `2. Puissance : 10^(dB ÷ 10) = 10^(${f(g, 1)} ÷ 10) = ${f(dbToPowerRatio(g), 3)}`,
        "→ +6 dB double la tension ; +3 dB double la puissance ; +10 dB multiplie la puissance par 10.",
      ]} />
    </div>
  );
}

// ---------- Loi d'Ohm : P, U, I, R ----------

const OHM_FORMULAS: Record<"u" | "i" | "p" | "r", Partial<Record<string, { f: string; sub: (v: Record<"u" | "i" | "p" | "r", string>) => string }>>> = {
  p: {
    ui: { f: "P = U × I", sub: (v) => `${v.u} × ${v.i}` },
    ur: { f: "P = U² ÷ R", sub: (v) => `${v.u}² ÷ ${v.r}` },
    ir: { f: "P = R × I²", sub: (v) => `${v.r} × ${v.i}²` },
  },
  i: {
    up: { f: "I = P ÷ U", sub: (v) => `${v.p} ÷ ${v.u}` },
    ur: { f: "I = U ÷ R", sub: (v) => `${v.u} ÷ ${v.r}` },
    pr: { f: "I = √(P ÷ R)", sub: (v) => `√(${v.p} ÷ ${v.r})` },
  },
  u: {
    ip: { f: "U = P ÷ I", sub: (v) => `${v.p} ÷ ${v.i}` },
    ir: { f: "U = R × I", sub: (v) => `${v.r} × ${v.i}` },
    pr: { f: "U = √(P × R)", sub: (v) => `√(${v.p} × ${v.r})` },
  },
  r: {
    ui: { f: "R = U ÷ I", sub: (v) => `${v.u} ÷ ${v.i}` },
    up: { f: "R = U² ÷ P", sub: (v) => `${v.u}² ÷ ${v.p}` },
    ip: { f: "R = P ÷ I²", sub: (v) => `${v.p} ÷ ${v.i}²` },
  },
};

export function OhmCalc() {
  const [u, setU] = useState("230");
  const [i, setI] = useState("");
  const [p, setP] = useState("2000");
  const [r, setR] = useState("");
  const res = solveOhm({ u: num(u), i: num(i), p: num(p), r: num(r) });
  const shown = res ? { u: f(res.u, 2), i: f(res.i, 2), p: f(res.p, 0), r: f(res.r, 2) } : null;
  const NAMES = { u: "Tension U", i: "Intensité I", p: "Puissance P", r: "Résistance R" } as const;
  const UNITS = { u: "V", i: "A", p: "W", r: "Ω" } as const;
  const filled = [u, i, p, r].filter((x) => ok(num(x)) && num(x) > 0).length;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="o-u" label="Tension U" value={u} onChange={setU} unit="V" />
        <Field id="o-i" label="Intensité I" value={i} onChange={setI} unit="A" />
        <Field id="o-p" label="Puissance P" value={p} onChange={setP} unit="W" />
        <Field id="o-r" label="Résistance R" value={r} onChange={setR} unit="Ω" />
      </div>
      <Note>Remplis deux cases (les autres se calculent). Efface une case pour la recalculer.</Note>
      {res && shown ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["u", "i", "p", "r"] as const).map((k) => <Big key={k} label={`${NAMES[k]}${res.given.includes(k) ? " (donnée)" : ""}`} value={`${shown[k]} ${UNITS[k]}`} />)}
          </div>
          {filled > 2 && <Note>Plus de deux valeurs saisies : seules {res.given.map((k) => k.toUpperCase()).join(" et ")} sont utilisées.</Note>}
          <Steps lines={[
            `Données : ${res.given.map((k) => `${k.toUpperCase()} = ${shown[k]} ${UNITS[k]}`).join(" ; ")}`,
            ...(["u", "i", "p", "r"] as const).filter((k) => !res.given.includes(k)).flatMap((k) => {
              const fm = OHM_FORMULAS[k][res.pair];
              return fm ? [`${fm.f}  →  ${fm.sub(shown)} = ${shown[k]} ${UNITS[k]}`] : [];
            }),
            "→ P = U × I   ;   R = U ÷ I   ;   P = U² ÷ R   ;   P = R × I²",
          ]} />
        </>
      ) : (
        <Note>Il faut au moins deux valeurs (par exemple U et P).</Note>
      )}
    </div>
  );
}

// ---------- Prises de courant par phase ----------

export function OutletsCalc() {
  const [watts, setWatts] = useState("6500");
  const [phases, setPhases] = useState<"1" | "3">("3");
  const [outlet, setOutlet] = useState("16");
  const w = num(watts);
  const n = phases === "3" ? 3 : 1;
  const A = num(outlet);
  const r = ok(w) && w > 0 ? outletsFor(w, n, A) : null;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="p-w" label="Puissance totale" value={watts} onChange={setWatts} unit="W" />
        <div>
          <label className="label" htmlFor="p-ph">Alimentation</label>
          <select id="p-ph" value={phases} onChange={(e) => setPhases(e.target.value as "1" | "3")} className="input"><option value="3">Tétraphasé (3 phases + neutre)</option><option value="1">Monophasé</option></select>
        </div>
        <div>
          <label className="label" htmlFor="p-pr">Calibre des prises</label>
          <select id="p-pr" value={outlet} onChange={(e) => setOutlet(e.target.value)} className="input"><option value="16">16 A</option><option value="32">32 A</option><option value="63">63 A</option></select>
        </div>
      </div>
      {r ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Big label={n === 3 ? "Intensité par phase" : "Intensité"} value={`${f(r.amps, 2)} A`} />
            <Big label={n === 3 ? "Prises par phase" : "Prises"} value={String(r.perPhase)} />
            {n === 3 && <Big label="Prises au total" value={String(r.total)} />}
            <Big label="Charge moyenne d'une prise" value={`${f(r.ampsPerOutlet, 1)} A (${f(r.pctPerOutlet, 0)} %)`} tone={r.pctPerOutlet > 80 ? "warn" : undefined} />
          </div>
          <Note>Phases supposées bien équilibrées. Dans une ligne de projet, l&apos;onglet Charge répartit les appareils réels.</Note>
          <Steps lines={[
            n === 3 ? `1. Puissance par phase : P ÷ 3 = ${f(w, 0)} ÷ 3 = ${f(r.perPhaseW, 0)} W` : `1. Puissance : P = ${f(w, 0)} W`,
            `2. Intensité : I = P ÷ U = ${f(r.perPhaseW, 0)} ÷ 230 = ${f(r.amps, 2)} A`,
            `3. Courant utilisable d'une prise (80 % du calibre) : ${f(A, 0)} × 0,8 = ${f(r.usable, 1)} A`,
            `4. Prises nécessaires : I ÷ ${f(r.usable, 1)} = ${f(r.amps, 2)} ÷ ${f(r.usable, 1)} = ${f(r.amps / r.usable, 2)} → ${r.perPhase} (arrondi au-dessus)`,
            ...(n === 3 ? [`   Au total : ${r.perPhase} × 3 phases = ${r.total} prises`] : []),
            `→ Courant moyen par prise : ${f(r.amps, 2)} ÷ ${r.perPhase} = ${f(r.ampsPerOutlet, 2)} A, soit ${f(r.ampsPerOutlet, 2)} ÷ ${f(A, 0)} = ${f(r.pctPerOutlet, 0)} % du calibre`,
          ]} />
        </>
      ) : (
        <Note>Indique une puissance en watts.</Note>
      )}
    </div>
  );
}

const PANELS: Record<TabId, { title: string; hint: string; body: React.ReactNode }> = {
  ohm: { title: "Loi d'Ohm et puissance", hint: "P = U × I et R = U ÷ I : donne deux valeurs, la calculette trouve les deux autres.", body: <OhmCalc /> },
  prises: { title: "Prises de courant par phase", hint: "Combien de prises (16, 32 ou 63 A) pour une puissance donnée, et quelle intensité sur chacune.", body: <OutletsCalc /> },
  cable: { title: "Câble : intensité et chute de tension", hint: "Quelle section pour quelle longueur, sans perdre trop de tension.", body: <CableCalc /> },
  dmx: { title: "Patch DMX", hint: "Combien d'univers, et à quelles adresses, pour tes projecteurs.", body: <DmxCalc /> },
  distance: { title: "Niveau sonore selon la distance", hint: "De combien le niveau baisse en s'éloignant de l'enceinte.", body: <DistanceCalc /> },
  somme: { title: "Somme de sources sonores", hint: "Le niveau total de plusieurs sources jouées ensemble.", body: <SumCalc /> },
  delai: { title: "Délai d'enceinte", hint: "Le retard à donner à une enceinte de renfort pour rester alignée sur la façade.", body: <DelayCalc /> },
  db: { title: "Décibels et rapports", hint: "Ce que vaut un gain en dB en tension et en puissance.", body: <DbCalc /> },
};

export function Calculettes() {
  const [tab, setTab] = useState<TabId>("ohm");
  const p = PANELS[tab];
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Calculettes" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t.id ? "bg-accent text-accent-fg" : "border border-line text-muted hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section className="card space-y-5 p-6" role="tabpanel">
        <div>
          <h2 className="text-lg font-semibold">{p.title}</h2>
          <p className="text-sm text-muted">{p.hint}</p>
        </div>
        {p.body}
      </section>
      <p className="text-xs text-muted">Estimations pour préparer un montage : cuivre, facteur de puissance 1, son en champ libre. Ce ne sont pas des calculs réglementaires ni des mesures.</p>
    </div>
  );
}
