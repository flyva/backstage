// Logique des fiches techniques (patch lumière), partagée serveur / client.
import { normalizeHeader } from "@/lib/csv";

export type LightFields = {
  channel: number | null;
  label: string;
  mode: string | null;
  universe: number;
  address: number | null;
  footprint: number;
  position: string | null;
  color: string | null;
  notes: string | null;
};

export const DMX_MAX = 512;

/** Adresses occupées : universe + [address, address + footprint - 1]. */
export function findConflicts<T extends Pick<LightFields, "universe" | "address" | "footprint" | "label">>(
  rows: (T & { id: number })[],
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const add = (id: number, msg: string) => out.set(id, [...(out.get(id) ?? []), msg]);
  const patched = rows.filter((r) => r.address !== null);

  for (const r of patched) {
    const end = r.address! + r.footprint - 1;
    if (end > DMX_MAX) add(r.id, `Dépasse l'univers (fin à ${end}, max ${DMX_MAX})`);
  }
  const byUniverse = Map.groupBy(patched, (r) => r.universe);
  for (const list of byUniverse.values()) {
    const sorted = [...list].sort((a, b) => a.address! - b.address!);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i], b = sorted[j];
        if (b.address! > a.address! + a.footprint - 1) break; // triés : plus aucun chevauchement possible avec a
        add(a.id, `Chevauche « ${b.label} » (${b.universe}.${String(b.address).padStart(3, "0")})`);
        add(b.id, `Chevauche « ${a.label} » (${a.universe}.${String(a.address).padStart(3, "0")})`);
      }
    }
  }
  return out;
}

export const patchLabel = (u: number, a: number | null) => (a === null ? "–" : `${u}.${String(a).padStart(3, "0")}`);

// ---------- import CSV ----------

const ALIASES: Record<string, string[]> = {
  channel: ["channel", "canal", "ch", "circuit", "fixture id", "fid", "id", "n", "no", "num", "numero", "unit"],
  label: ["fixture", "name", "nom", "label", "libelle", "fixture name", "fixture type", "type", "appareil", "projecteur", "designation", "model", "modele"],
  mode: ["mode", "dmx mode", "personality", "personnalite"],
  universe: ["universe", "univers", "univ", "dmx universe", "u"],
  address: ["address", "adresse", "dmx address", "dmx", "addr", "adr", "start address", "patch"],
  footprint: ["footprint", "channels", "nb canaux", "canaux dmx", "dmx channels", "nb ch", "channel count", "nombre de canaux"],
  position: ["position", "pos", "location", "lieu", "emplacement", "rig position"],
  color: ["color", "colour", "couleur", "gel", "filter", "filtre"],
  notes: ["notes", "note", "remarque", "remarques", "comment", "comments", "commentaire", "observations"],
};

const toInt = (v: string | undefined): number | null => {
  if (!v) return null;
  const n = Number(v.replace(/[^\d-]/g, ""));
  return Number.isFinite(n) && v.match(/\d/) ? n : null;
};

export type ImportResult = { lights: LightFields[]; skipped: number; warnings: string[]; recognized: string[]; ignored: string[] };

export function mapLightCsv(rows: string[][]): ImportResult {
  const warnings: string[] = [];
  if (rows.length < 2) return { lights: [], skipped: 0, warnings: ["Le fichier ne contient pas de données (il faut une ligne d'en-tête puis des lignes)."], recognized: [], ignored: [] };

  const header = rows[0].map(normalizeHeader);
  const col: Partial<Record<keyof typeof ALIASES, number>> = {};
  const used = new Set<number>();
  // Un alias plus spécifique (ordre du tableau) l'emporte ; une colonne n'est attribuée qu'une fois.
  for (const key of Object.keys(ALIASES)) {
    for (const alias of ALIASES[key]) {
      const i = header.findIndex((h, idx) => h === alias && !used.has(idx));
      if (i >= 0) { col[key] = i; used.add(i); break; }
    }
  }
  if (col.label === undefined) {
    return { lights: [], skipped: rows.length - 1, warnings: ["Colonne du nom introuvable : ajoute une colonne « Nom » (ou Type, Fixture, Appareil…)."], recognized: [], ignored: rows[0] };
  }

  const lights: LightFields[] = [];
  let skipped = 0;
  for (const [n, r] of rows.slice(1).entries()) {
    const get = (k: keyof typeof ALIASES) => (col[k] === undefined ? undefined : r[col[k]!]);
    const label = get("label")?.trim();
    if (!label) { skipped++; continue; }

    let universe = toInt(get("universe")) ?? 1;
    let address: number | null = null;
    const rawAddr = get("address")?.trim();
    if (rawAddr) {
      // « 2.045 » ou « 2/45 » : univers et adresse dans la même cellule.
      const m = /^(\d+)\s*[./]\s*(\d+)$/.exec(rawAddr);
      if (m) { universe = Number(m[1]); address = Number(m[2]); } else address = toInt(rawAddr);
    }
    if (address !== null && (address < 1 || address > DMX_MAX)) {
      warnings.push(`Ligne ${n + 2} (« ${label} ») : adresse ${address} hors de 1–${DMX_MAX}, importée sans adresse.`);
      address = null;
    }
    lights.push({
      channel: toInt(get("channel")),
      label: label.slice(0, 120),
      mode: get("mode")?.slice(0, 60) || null,
      universe: Math.min(Math.max(universe, 1), 999),
      address,
      footprint: Math.min(Math.max(toInt(get("footprint")) ?? 1, 1), DMX_MAX),
      position: get("position")?.slice(0, 100) || null,
      color: get("color")?.slice(0, 60) || null,
      notes: get("notes")?.slice(0, 300) || null,
    });
  }
  if (lights.length > 500) warnings.push("Plus de 500 lignes : seules les 500 premières sont importées.");
  return {
    lights: lights.slice(0, 500),
    skipped,
    warnings,
    recognized: Object.entries(col).map(([k, i]) => `${rows[0][i as number]} → ${k}`),
    ignored: rows[0].filter((_, i) => !used.has(i)),
  };
}
