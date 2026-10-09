// Calcul de charge électrique (partagé serveur / client). Monophasé 230 V, facteur de puissance 1 (estimation).
export const VOLTS = 230;
export const amps = (watts: number) => watts / VOLTS;

export type PowerItem = { id: number; circuitId: number | null; name: string; watts: number; qty: number };
export type SupplyMode = "mono" | "tetra";
export type PowerCircuit = { id: number; name: string; breakerAmps: number; phase: number; mode?: SupplyMode; outletAmps?: number; feederAmps?: number | null };

export type CircuitLoad = { circuit: PowerCircuit; watts: number; amps: number; pct: number; level: "ok" | "warn" | "over" };

/** Charge par circuit : « attention » au-delà de 80 % du calibre (charge continue), « surcharge » au-delà de 100 %. */
export function circuitLoads(circuits: PowerCircuit[], items: PowerItem[]): CircuitLoad[] {
  return circuits.map((circuit) => {
    const watts = items.filter((i) => i.circuitId === circuit.id).reduce((s, i) => s + i.watts * i.qty, 0);
    const a = amps(watts);
    const pct = (a / circuit.breakerAmps) * 100;
    return { circuit, watts, amps: a, pct, level: pct > 100 ? "over" : pct > 80 ? "warn" : "ok" };
  });
}

/** Puissance par phase (1 à 3), pour équilibrer un départ triphasé. */
export function phaseLoads(loads: CircuitLoad[]) {
  return [1, 2, 3].map((phase) => {
    const watts = loads.filter((l) => l.circuit.phase === phase).reduce((s, l) => s + l.watts, 0);
    return { phase, watts, amps: amps(watts) };
  });
}

/**
 * Courant dans le neutre d'un départ 3 phases + neutre (charges résistives, phases décalées de 120°) :
 * In = √(I1² + I2² + I3² − I1·I2 − I2·I3 − I3·I1). Nul si les trois phases sont égales, égal au courant d'une phase si une seule est utilisée.
 */
export const neutralAmps = (i1: number, i2: number, i3: number) =>
  Math.sqrt(Math.max(0, i1 * i1 + i2 * i2 + i3 * i3 - i1 * i2 - i2 * i3 - i3 * i1));


export const fmtAmps = (a: number) => (a < 10 ? a.toFixed(1) : String(Math.round(a))).replace(".", ",");
export const fmtWatts = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(2).replace(".", ",")} kW` : `${w} W`);

/** Nombre à la française (espaces entre les milliers, virgule décimale) pour afficher les calculs. */
export const fmtNum = (n: number, digits = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Calibres proposés pour une ligne d'alimentation. */
export const LINE_AMPS = [16, 32, 63, 125] as const;
/** Calibres de prises de courant proposés (16 A domestique/CEE, 32 A, 63 A). */
export const OUTLET_AMPS = [16, 32, 63] as const;
/** On remplit une prise jusqu'à 80 % de son calibre (marge de sécurité). */
export const OUTLET_FILL = 0.8;

export type PhaseGroup = { itemId: number; name: string; watts: number; qty: number };
export type OutletResult = { index: number; groups: PhaseGroup[]; watts: number; amps: number; pct: number };
export type FeederPhase = { phase: number; groups: PhaseGroup[]; watts: number; amps: number; pct: number; outlets: OutletResult[] };
export type FeederResult = { index: number; phases: FeederPhase[]; watts: number; maxPct: number };
export type PhaseResult = { phase: number; groups: PhaseGroup[]; watts: number; amps: number; pct: number; outlets: OutletResult[]; outletsMin: number };
export type LineResult = {
  circuit: PowerCircuit;
  mode: SupplyMode;
  watts: number;
  phases: PhaseResult[];
  neutral: number; // courant dans le neutre (tétra), 0 en mono
  worstPct: number; // charge de la phase la plus chargée, en % du calibre
  level: "ok" | "warn" | "over";
  capacityAmps: number;
  capacityWatts: number;
  feederAmps: number | null; // calibre des départs si la ligne est divisée
  feedersMin: number; // nombre minimum de départs
  feeders: FeederResult[];
};

/**
 * Répartition des appareils d'une phase sur des prises de courant : du plus gros au plus petit, chacun dans la première prise
 * où il tient sans dépasser 80 % de son calibre, sinon dans une nouvelle prise.
 */
export function packOutlets(groups: PhaseGroup[], outletAmps: number): OutletResult[] {
  const cap = outletAmps * VOLTS * OUTLET_FILL;
  const units = groups.flatMap((g) => Array.from({ length: g.qty }, () => g)).sort((a, b) => b.watts - a.watts);
  const bins: { watts: number; groups: Map<number, PhaseGroup> }[] = [];
  for (const u of units) {
    let bin = bins.find((b) => b.watts + u.watts <= cap);
    if (!bin) {
      bin = { watts: 0, groups: new Map() };
      bins.push(bin);
    }
    bin.watts += u.watts;
    const g = bin.groups.get(u.itemId);
    if (g) g.qty += 1;
    else bin.groups.set(u.itemId, { ...u, qty: 1 });
  }
  return bins.map((b, i) => ({ index: i + 1, groups: [...b.groups.values()], watts: b.watts, amps: amps(b.watts), pct: (amps(b.watts) / outletAmps) * 100 }));
}

/**
 * Division d'une ligne en départs (ex. un 63 A tétra divisé en départs de 32 A) : le nombre de départs est celui qu'exige la
 * phase la plus chargée (80 % du calibre du départ). Sur chaque phase, les appareils sont répartis entre les départs (toujours
 * sur le moins chargé), puis rangés sur des prises dans chaque départ.
 */
function splitFeeders(phases: PhaseResult[], feederAmps: number, outletAmps: number): { feeders: FeederResult[]; min: number } {
  const usable = feederAmps * OUTLET_FILL;
  const min = Math.max(...phases.map((p) => Math.ceil(p.amps / usable - 1e-9)), 0);
  if (min === 0) return { feeders: [], min: 0 };
  const feeders: FeederResult[] = Array.from({ length: min }, (_, i) => ({ index: i + 1, phases: [], watts: 0, maxPct: 0 }));
  for (const p of phases) {
    const sums = Array.from({ length: min }, () => 0);
    const groups: Map<number, PhaseGroup>[] = Array.from({ length: min }, () => new Map());
    const units = p.groups.flatMap((g) => Array.from({ length: g.qty }, () => g)).sort((a, b) => b.watts - a.watts);
    for (const u of units) {
      const f = sums.indexOf(Math.min(...sums));
      sums[f] += u.watts;
      const g = groups[f].get(u.itemId);
      if (g) g.qty += 1;
      else groups[f].set(u.itemId, { ...u, qty: 1 });
    }
    feeders.forEach((fd, f) => {
      const list = [...groups[f].values()];
      const a = amps(sums[f]);
      fd.phases.push({ phase: p.phase, groups: list, watts: sums[f], amps: a, pct: (a / feederAmps) * 100, outlets: packOutlets(list, outletAmps) });
    });
  }
  for (const fd of feeders) {
    fd.watts = fd.phases.reduce((n, p) => n + p.watts, 0);
    fd.maxPct = Math.max(...fd.phases.map((p) => p.pct));
  }
  return { feeders, min };
}

/**
 * Calcul d'une ligne : les appareils sont répartis tout seuls sur les phases (un par un, du plus gros au plus petit, sur la
 * phase la moins chargée), puis chaque phase est comparée au calibre. En monophasé, tout est sur une seule phase.
 */
export function lineResult(circuit: PowerCircuit, items: PowerItem[]): LineResult {
  const mode: SupplyMode = circuit.mode ?? "tetra";
  const n = mode === "tetra" ? 3 : 1;
  const sums = Array.from({ length: n }, () => 0);
  const groups: Map<number, PhaseGroup>[] = Array.from({ length: n }, () => new Map());
  const mine = items.filter((i) => i.circuitId === circuit.id).sort((a, b) => b.watts - a.watts || a.id - b.id);
  for (const it of mine) {
    for (let k = 0; k < it.qty; k++) {
      const p = sums.indexOf(Math.min(...sums));
      sums[p] += it.watts;
      const g = groups[p].get(it.id);
      if (g) g.qty += 1;
      else groups[p].set(it.id, { itemId: it.id, name: it.name, watts: it.watts, qty: 1 });
    }
  }
  const phases = sums.map((watts, p) => {
    const a = amps(watts);
    const list = [...groups[p].values()];
    const outletAmps = circuit.outletAmps ?? 16;
    return { phase: p + 1, groups: list, watts, amps: a, pct: (a / circuit.breakerAmps) * 100, outlets: packOutlets(list, outletAmps), outletsMin: Math.ceil(a / (outletAmps * OUTLET_FILL) - 1e-9) };
  });
  const worstPct = Math.max(...phases.map((p) => p.pct));
  const feederAmps = circuit.feederAmps ?? null;
  const split = feederAmps ? splitFeeders(phases, feederAmps, circuit.outletAmps ?? 16) : { feeders: [], min: 0 };
  return {
    circuit,
    mode,
    watts: sums.reduce((a, b) => a + b, 0),
    phases,
    neutral: mode === "tetra" ? neutralAmps(phases[0].amps, phases[1].amps, phases[2].amps) : 0,
    worstPct,
    level: worstPct > 100 ? "over" : worstPct > 80 ? "warn" : "ok",
    capacityAmps: circuit.breakerAmps * n,
    capacityWatts: circuit.breakerAmps * n * VOLTS,
    feederAmps,
    feedersMin: split.min,
    feeders: split.feeders,
  };
}
