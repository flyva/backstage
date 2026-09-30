// Calculettes de régie (fonctions pures, partagées serveur / client).

// ---------- Électricité ----------

export const RHO_CU = 0.0225; // Ω·mm²/m, cuivre en service (valeur de la NF C 15-100)
/** Intensité admissible indicative (A) par section de cuivre (mm²), câble souple posé à l'air libre et déroulé. */
export const SECTIONS: { s: number; amps: number }[] = [
  { s: 1.5, amps: 16 }, { s: 2.5, amps: 25 }, { s: 4, amps: 34 }, { s: 6, amps: 43 }, { s: 10, amps: 60 }, { s: 16, amps: 80 }, { s: 25, amps: 101 },
];

export type Supply = "mono" | "tri";

/** Intensité d'une charge : monophasé P/U (U = 230 V), triphasé P/(√3 × U) (U = 400 V). Facteur de puissance 1. */
export const currentOf = (watts: number, supply: Supply) => (supply === "mono" ? watts / 230 : watts / (Math.sqrt(3) * 400));

/** Chute de tension en % sur une ligne : mono 2 × ρ × L × I / S sur 230 V ; tri √3 × ρ × L × I / S sur 400 V. */
export function voltageDropPct(amps: number, lengthM: number, sectionMm2: number, supply: Supply) {
  const k = supply === "mono" ? 2 : Math.sqrt(3);
  const drop = (k * RHO_CU * lengthM * amps) / sectionMm2;
  return (drop / (supply === "mono" ? 230 : 400)) * 100;
}

/** Plus petite section standard qui respecte à la fois la chute de tension maximale et l'intensité admissible. */
export function minSection(amps: number, lengthM: number, supply: Supply, maxDropPct: number) {
  return SECTIONS.find((x) => x.amps >= amps && voltageDropPct(amps, lengthM, x.s, supply) <= maxDropPct) ?? null;
}

/** Longueur maximale (m) pour ne pas dépasser la chute de tension permise. */
export function maxLength(amps: number, sectionMm2: number, supply: Supply, maxDropPct: number) {
  if (amps <= 0) return Infinity;
  const k = supply === "mono" ? 2 : Math.sqrt(3);
  const u = supply === "mono" ? 230 : 400;
  return ((maxDropPct / 100) * u * sectionMm2) / (k * RHO_CU * amps);
}

// ---------- DMX ----------

export type DmxLine = { name: string; qty: number; footprint: number };
export type DmxResult = {
  rows: { name: string; qty: number; footprint: number; from: string; to: string }[];
  universes: number;
  channels: number;
  freeInLast: number;
  errors: string[];
};

const addr = (u: number, a: number) => `${u}.${String(a).padStart(3, "0")}`;

/** Répartit les projecteurs dans les univers (512 canaux) sans jamais couper un projecteur entre deux univers. */
export function patchDmx(lines: DmxLine[], gap = 0): DmxResult {
  const errors: string[] = [];
  let u = 1;
  let next = 1;
  let channels = 0;
  let lastEnd = 0;
  const rows: DmxResult["rows"] = [];
  for (const l of lines) {
    if (!(l.qty >= 1) || !(l.footprint >= 1)) continue;
    if (l.footprint > 512) { errors.push(`« ${l.name || "?"} » dépasse 512 canaux`); continue; }
    let from = "";
    let to = "";
    for (let i = 0; i < l.qty; i++) {
      if (next + l.footprint - 1 > 512) { u++; next = 1; }
      if (i === 0) from = addr(u, next);
      to = addr(u, next + l.footprint - 1);
      lastEnd = next + l.footprint - 1;
      next += l.footprint + gap;
      channels += l.footprint;
    }
    rows.push({ name: l.name || "Projecteur", qty: l.qty, footprint: l.footprint, from, to });
  }
  return { rows, universes: channels === 0 ? 0 : u, channels, freeInLast: channels === 0 ? 0 : Math.max(0, 512 - lastEnd), errors };
}

// ---------- Son ----------

/** Niveau à la distance d2 quand il vaut spl1 à d1 (champ libre : −6 dB à chaque doublement de la distance). */
export const splAtDistance = (spl1: number, d1: number, d2: number) => spl1 - 20 * Math.log10(d2 / d1);
/** Somme de niveaux en dB (sources non corrélées). */
export const sumDb = (levels: number[]) => (levels.length ? 10 * Math.log10(levels.reduce((s, l) => s + 10 ** (l / 10), 0)) : NaN);
/** Vitesse du son (m/s) selon la température (°C). */
export const soundSpeed = (tempC: number) => 331.3 + 0.606 * tempC;
/** Délai (ms) à appliquer pour aligner une enceinte à distanceM d'une référence. */
export const delayMs = (distanceM: number, tempC: number) => (distanceM / soundSpeed(tempC)) * 1000;
export const dbToVoltageRatio = (db: number) => 10 ** (db / 20);
export const dbToPowerRatio = (db: number) => 10 ** (db / 10);
