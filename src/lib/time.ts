/** « 2:30 » / « 1:02:03 » / « 90 » (secondes) → secondes. null si vide, undefined si invalide. */
export function parseDuration(input: string): number | null | undefined {
  const v = input.trim();
  if (v === "") return null;
  if (/^\d+$/.test(v)) return Number(v);
  const m = /^(?:(\d+):)?(\d{1,3}):([0-5]?\d)$/.exec(v);
  if (!m) return undefined;
  return (m[1] ? Number(m[1]) * 3600 : 0) + Number(m[2]) * 60 + Number(m[3]);
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "–";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  lumiere: "Lumière",
  son: "Son",
  video: "Vidéo",
  plateau: "Plateau",
  regie: "Régie",
  autre: "Autre",
};
