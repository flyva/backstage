// Partagé entre serveur et client : affichage d'un créneau (heure de Paris).
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const ymd = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(d);

/** « mer. 7 oct. · 14:00 – 16:00 » (ou « … · 14:00 » sans fin ; la date de fin est ajoutée si elle tombe un autre jour). */
export function slotLabel(start: Date, end: Date | null): string {
  const base = `${dayFmt.format(start)} · ${timeFmt.format(start)}`;
  if (!end) return base;
  return ymd(start) === ymd(end) ? `${base} – ${timeFmt.format(end)}` : `${base} → ${dayFmt.format(end)} ${timeFmt.format(end)}`;
}
