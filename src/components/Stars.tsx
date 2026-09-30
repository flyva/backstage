/** Note sur 5 en étoiles (affichage seul). */
export function Stars({ value, size = "text-base" }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} leading-none text-[#f59e0b]`} role="img" aria-label={`${value.toFixed(1).replace(".", ",")} sur 5`}>
      {"★".repeat(full)}
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}

/** « ★ 4,5 (3 avis) » : résumé compact de la réputation d'une personne. */
export function RatingBadge({ avg, n }: { avg: number; n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Stars value={avg} size="text-sm" />
      <span className="tabular-nums">{avg.toFixed(1).replace(".", ",")} ({n} avis)</span>
    </span>
  );
}
