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

export const fmtAmps = (a: number) => (a < 10 ? a.toFixed(1) : String(Math.round(a))).replace(".", ",");
export const fmtWatts = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(2).replace(".", ",")} kW` : `${w} W`);
