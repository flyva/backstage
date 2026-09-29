// Utilitaires de dates en fuseau Europe/Paris (indépendants du fuseau du serveur).
const TZ = "Europe/Paris";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function parisParts(d: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

export const dayKey = (d: Date) => {
  const p = parisParts(d);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
};

/** Date réelle pour une heure « murale » à Paris (gère l'heure d'été). */
export function parisWallToDate(y: number, mo: number, d: number, h: number, mi: number, s: number): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const p = parisParts(new Date(guess));
  const asIfUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return new Date(guess - (asIfUtc - guess));
}

/** « 2026-12-12T20:30 » (champ datetime-local) → Date, interprété à l'heure de Paris. */
export function parseParisInput(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const d = parisWallToDate(+m[1], +m[2], +m[3], +m[4], +m[5], 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → valeur d'un champ datetime-local, à l'heure de Paris. */
export function toParisInput(d: Date): string {
  const p = parisParts(d);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${z(p.mo)}-${z(p.d)}T${z(p.h)}:${z(p.mi)}`;
}
