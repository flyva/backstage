// CSV tolérant (guillemets, virgule / point-virgule / tabulation, BOM). Partagé serveur / client.

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  // Séparateur détecté sur la première ligne : le plus fréquent parmi ; , tabulation.
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [";", ",", "\t"].map((d) => [d, first.split(d).length - 1]);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

/** Échappe une cellule ; neutralise aussi les « formules » (=, +, -, @) pour l'ouverture dans Excel. */
function cell(v: string | number | boolean | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Point-virgule + BOM : s'ouvre correctement dans Excel en français. */
export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

export const normalizeHeader = (h: string) =>
  h.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
