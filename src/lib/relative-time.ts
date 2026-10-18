/** « il y a 12 min », « il y a 3 h », « hier », « il y a 4 j », puis la date. */
export function ago(date: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} j`;
  return date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
}

/**
 * « Dernière connexion » précise, pour une fiche ou une conversation : aujourd'hui → juste l'heure ; hier → « Hier à
 * HH:MM » ; dans la semaine → « Lundi à HH:MM » ; plus loin → « 3 oct. à HH:MM ».
 */
export function lastSeenLabel(date: Date, now = new Date()): string {
  const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
  const diffDays = Math.round((Date.parse(`${dayKey(now)}T00:00:00Z`) - Date.parse(`${dayKey(date)}T00:00:00Z`)) / 864e5);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(date);
  if (diffDays <= 0) return time;
  if (diffDays === 1) return `Hier à ${time}`;
  if (diffDays < 7) {
    const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long" }).format(date);
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} à ${time}`;
  }
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" }).format(date);
  return `${day} à ${time}`;
}
