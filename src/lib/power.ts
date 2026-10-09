// Calcul de charge électrique (partagé serveur / client). Monophasé 230 V, facteur de puissance 1 (estimation).
export const VOLTS = 230;
export const amps = (watts: number) => watts / VOLTS;

export type PowerItem = { id: number; circuitId: number | null; name: string; watts: number; qty: number };
export type PowerCircuit = { id: number; name: string; breakerAmps: number; phase: number };

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

export type SupplyMode = "mono" | "tetra";

/** Nombre de phases utilisées par le mode d'alimentation. */
export const phaseCount = (mode: SupplyMode) => (mode === "mono" ? 1 : 3);

/**
 * Répartition automatique des circuits sur les phases : on prend les circuits du plus gourmand au moins gourmand et on met
 * chacun sur la phase la moins chargée à cet instant (L1, L2 ou L3). Renvoie la phase choisie pour chaque circuit.
 */
export function balancePhases(loads: { circuit: { id: number }; watts: number }[], phases = 3): Map<number, number> {
  const sums = Array.from({ length: phases }, () => 0);
  const out = new Map<number, number>();
  for (const l of [...loads].sort((a, b) => b.watts - a.watts || a.circuit.id - b.circuit.id)) {
    const p = sums.indexOf(Math.min(...sums));
    sums[p] += l.watts;
    out.set(l.circuit.id, p + 1);
  }
  return out;
}

export const fmtAmps = (a: number) => (a < 10 ? a.toFixed(1) : String(Math.round(a))).replace(".", ",");
export const fmtWatts = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(2).replace(".", ",")} kW` : `${w} W`);

/** Nombre à la française (espaces entre les milliers, virgule décimale) pour afficher les calculs. */
export const fmtNum = (n: number, digits = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
