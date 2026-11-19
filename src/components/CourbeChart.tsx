// Courbe (SVG, sans dépendance) : solde cumulé mois par mois depuis le début de l'exercice.
const MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const H = 140;
const PAD_X = 20;

export function CourbeChart({ points }: { points: number[] }) {
  const width = 560;
  const max = Math.max(1, ...points.map(Math.abs));
  const mid = H / 2;
  const scale = (H / 2 - 10) / max;
  const step = (width - PAD_X * 2) / Math.max(1, points.length - 1);
  const coords = points.map((v, i) => [PAD_X + i * step, mid - v * scale] as const);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-bg p-3">
      <svg viewBox={`0 0 ${width} ${H + 24}`} width={width} height={H + 24} role="img" aria-label="Solde cumulé par mois" className="block">
        <line x1={0} y1={mid} x2={width} y2={mid} stroke="var(--border)" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {coords.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={2.5} fill="var(--accent)" />
            <text x={x} y={H + 16} textAnchor="middle" className="fill-muted text-[9px]">{MONTHS[i]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
