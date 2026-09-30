import "server-only";
import type { WorkKind } from "@/db/schema";

// Lecture du calendrier de formation en alternance de l'école (PDF : un mois par colonne, un jour par ligne, chaque
// jour coloré selon la période). Le PDF ne dit pas « école » avec des mots pour chaque jour : c'est la COULEUR de la case.
// On apprend donc la couleur de chaque type grâce aux étiquettes écrites dans les cases (« 3IS », « ENTREPRISE », « FERIE »,
// « Rentrée »), puis on lit chaque jour. Ainsi la lecture ne dépend pas d'une palette précise.

export type CalendarDay = { day: string; kind: WorkKind };
export type ParsedCalendar = {
  days: CalendarDay[];
  from: string | null;
  to: string | null;
  counts: Record<"ecole" | "entreprise" | "ferie", number>;
  warnings: string[];
};

type Rect = { x: number; y: number; w: number; h: number; fill: string };
type Text = { s: string; x: number; y: number };

const MONTHS: Record<string, number> = {
  janv: 1, janvier: 1, "févr": 2, fevr: 2, "février": 2, fevrier: 2, mars: 3, avr: 4, avril: 4, mai: 5, juin: 6, juil: 7, juillet: 7,
  "août": 8, aout: 8, sept: 9, septembre: 9, oct: 10, octobre: 10, nov: 11, novembre: 11, "déc": 12, dec: 12, "décembre": 12, decembre: 12,
};

const LABELS: { re: RegExp; kind: WorkKind }[] = [
  { re: /^3\s?IS$/i, kind: "ecole" },
  { re: /^(centre|école|ecole|cfa)$/i, kind: "ecole" },
  { re: /^rentr[ée]e$/i, kind: "ecole" },
  { re: /^entreprise$/i, kind: "entreprise" },
  { re: /^f[ée]ri[ée]s?$/i, kind: "ferie" },
];

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Lit le calendrier d'un PDF. Lève une erreur claire si le fichier n'a pas cette forme. */
export async function parseCalendarPdf(bytes: Uint8Array): Promise<ParsedCalendar> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise;
  try {
    const dayMap = new Map<string, WorkKind>();
    const warnings: string[] = [];
    for (let p = 1; p <= Math.min(doc.numPages, 4); p++) {
      const page = await doc.getPage(p);
      const one = await parsePage(pdfjs, page, warnings);
      for (const [d, k] of one) dayMap.set(d, k);
    }
    if (dayMap.size === 0) throw new Error("Calendrier non reconnu : je ne trouve pas de grille mois par mois avec des cases colorées.");
    const days = [...dayMap].map(([day, kind]) => ({ day, kind })).sort((a, b) => a.day.localeCompare(b.day));
    const counts = { ecole: 0, entreprise: 0, ferie: 0 } as ParsedCalendar["counts"];
    for (const d of days) if (d.kind in counts) counts[d.kind as keyof typeof counts]++;
    return { days, from: days[0].day, to: days[days.length - 1].day, counts, warnings };
  } finally {
    await doc.destroy();
  }
}

type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

async function parsePage(pdfjs: PdfjsModule, page: Awaited<ReturnType<Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]>["getPage"]>>, warnings: string[]) {
  const OPS = pdfjs.OPS;

  // --- 1. Rectangles remplis (avec leur couleur) ---
  const ops = await page.getOperatorList();
  const rects: Rect[] = [];
  let fill = "#000000";
  const stack: { fill: string; ctm: number[] }[] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push({ fill, ctm: [...ctm] });
    else if (fn === OPS.restore) { const s = stack.pop(); if (s) { fill = s.fill; ctm = s.ctm; } }
    else if (fn === OPS.transform) {
      const [a, b, c, d, e, f] = args as number[];
      const [A, B, C, D, E, F] = ctm;
      ctm = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F];
    } else if (fn === OPS.setFillRGBColor) fill = typeof args[0] === "string" ? args[0] : `rgb:${args.join(",")}`;
    else if (fn === OPS.setFillGray) fill = `gray:${args[0]}`;
    else if (fn === OPS.setFillCMYKColor) fill = `cmyk:${args.join(",")}`;
    else if (fn === OPS.constructPath) {
      const subOps = args[0] as number[];
      const coords = args[1] as number[];
      let ci = 0;
      for (const o of subOps) {
        if (o === OPS.rectangle) {
          const [x, y, w, h] = coords.slice(ci, ci + 4);
          ci += 4;
          const x0 = x * ctm[0] + ctm[4];
          const y0 = y * ctm[3] + ctm[5];
          const w0 = w * ctm[0];
          const h0 = h * ctm[3];
          rects.push({ x: Math.min(x0, x0 + w0), y: Math.min(y0, y0 + h0), w: Math.abs(w0), h: Math.abs(h0), fill });
        } else if (o === OPS.moveTo || o === OPS.lineTo) ci += 2;
        else if (o === OPS.curveTo) ci += 6;
        else if (o === OPS.curveTo2 || o === OPS.curveTo3) ci += 4;
      }
    }
  }

  // --- 2. Textes positionnés ---
  const tc = await page.getTextContent();
  const texts: Text[] = tc.items
    .filter((i): i is (typeof tc.items)[number] & { str: string; transform: number[] } => "str" in i && !!i.str.trim())
    .map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5] }));

  // --- 3. En-têtes de mois (« août-26 ») ---
  const headers = texts
    .map((t) => {
      const m = /^([a-zéûèô]+)\.?-(\d{2})$/i.exec(t.s);
      const month = m ? MONTHS[m[1].toLowerCase()] : undefined;
      return m && month ? { month, year: 2000 + Number(m[2]), x: t.x, y: t.y } : null;
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);
  if (headers.length === 0) throw new Error("Calendrier non reconnu : aucun en-tête de mois (par ex. « octobre-26 »).");

  // --- 4. Cases des jours : la taille de case la plus fréquente parmi les petits rectangles ---
  const sizeKey = (r: Rect) => `${Math.round(r.w)}x${Math.round(r.h)}`;
  const small = rects.filter((r) => r.w > 20 && r.w < 80 && r.h > 5 && r.h < 14);
  const freq = new Map<string, number>();
  for (const r of small) freq.set(sizeKey(r), (freq.get(sizeKey(r)) ?? 0) + 1);
  const best = [...freq].sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 50) throw new Error("Calendrier non reconnu : je ne trouve pas la grille des jours.");
  const cells = small.filter((r) => sizeKey(r) === best[0]);

  const colXs = [...new Set(cells.map((c) => Math.round(c.x)))].sort((a, b) => a - b);
  // Regroupe les x presque identiques (arrondis) en colonnes.
  const cols: number[] = [];
  for (const x of colXs) if (cols.length === 0 || x - cols[cols.length - 1] > 5) cols.push(x);
  const rowYs = [...new Set(cells.map((c) => Math.round(c.y)))].sort((a, b) => b - a);
  const rows: number[] = [];
  for (const y of rowYs) if (rows.length === 0 || rows[rows.length - 1] - y > 3) rows.push(y);
  if (rows.length < 28 || rows.length > 31) warnings.push(`Grille inhabituelle : ${rows.length} lignes de jours.`);

  const colOf = (x: number) => { let bi = -1, bd = Infinity; cols.forEach((c, i) => { const d = Math.abs(c - x); if (d < bd) { bd = d; bi = i; } }); return bd < 25 ? bi : -1; };
  const rowOf = (y: number) => { let bi = -1, bd = Infinity; rows.forEach((r, i) => { const d = Math.abs(r - y); if (d < bd) { bd = d; bi = i; } }); return bd < 6 ? bi : -1; };
  const cellAt = new Map<string, Rect>();
  for (const c of cells) { const ci = colOf(c.x); const ri = rowOf(c.y); if (ci >= 0 && ri >= 0) cellAt.set(`${ci}:${ri}`, c); }

  // Mois de chaque colonne : l'en-tête le plus proche horizontalement.
  const monthOfCol = new Map<number, { month: number; year: number }>();
  for (const h of headers) {
    const ci = colOf(h.x - 4);
    if (ci >= 0 && !monthOfCol.has(ci)) monthOfCol.set(ci, { month: h.month, year: h.year });
  }

  // --- 5. Couleur → type, d'après les étiquettes écrites dans les cases ---
  const votes = new Map<string, Map<WorkKind, number>>();
  for (const t of texts) {
    const label = LABELS.find((l) => l.re.test(t.s));
    if (!label) continue;
    // Le texte peut commencer un peu à gauche de la case ou tomber entre deux cases : on cherche la case sous son centre.
    const ci = colOf(t.x + 6);
    if (ci < 0) continue;
    const c = cells.find((r) => colOf(r.x) === ci && t.y >= r.y - 1 && t.y <= r.y + r.h + 1);
    if (!c) continue;
    const m = votes.get(c.fill) ?? new Map<WorkKind, number>();
    m.set(label.kind, (m.get(label.kind) ?? 0) + 1);
    votes.set(c.fill, m);
  }
  const kindOfColor = new Map<string, WorkKind>();
  for (const [color, m] of votes) {
    const sorted = [...m].sort((a, b) => b[1] - a[1]);
    kindOfColor.set(color, sorted[0][0]);
    if (sorted.length > 1) warnings.push("Une couleur porte deux étiquettes différentes : lecture à vérifier.");
  }
  if (![...kindOfColor.values()].includes("ecole") && ![...kindOfColor.values()].includes("entreprise")) {
    throw new Error("Calendrier non reconnu : les étiquettes « 3IS » et « ENTREPRISE » n'ont pas été trouvées dans les cases colorées.");
  }

  // --- 6. Lecture jour par jour ---
  const out = new Map<string, WorkKind>();
  for (const [ci, { month, year }] of monthOfCol) {
    const max = daysIn(year, month);
    for (let ri = 0; ri < Math.min(rows.length, max); ri++) {
      const c = cellAt.get(`${ci}:${ri}`);
      const kind = c ? kindOfColor.get(c.fill) : undefined;
      if (kind) out.set(iso(year, month, ri + 1), kind);
    }
  }
  return out;
}
