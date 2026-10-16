// Graphique en barres (SVG, sans dépendance) : effectif / heures sup par semaine, mois ou année.
export type ChartBar = { label: string; effective: number; overtime: number };

const BAR_H = 120; // hauteur max des barres, en px
const BAR_W = 36;
const GAP = 18;

export function TimeBarChart({ bars, title }: { bars: ChartBar[]; title: string }) {
  if (bars.length === 0) return null;
  const max = Math.max(60, ...bars.map((b) => b.effective + b.overtime));
  const width = bars.length * (BAR_W + GAP) + GAP;
  const height = BAR_H + 40;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-bg p-3">
      <p className="mb-2 text-xs font-medium text-muted">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={title} className="block">
        {bars.map((b, i) => {
          const x = GAP + i * (BAR_W + GAP);
          const effH = (b.effective / max) * BAR_H;
          const otH = (b.overtime / max) * BAR_H;
          const yEff = BAR_H - effH;
          const yOt = yEff - otH;
          const topLabelY = Math.max(10, (b.overtime > 0 ? yOt : yEff) - 4);
          const totalH = Math.round(((b.effective + b.overtime) / 60) * 10) / 10;
          return (
            <g key={i}>
              <rect x={x} y={yEff} width={BAR_W} height={effH} fill="var(--accent)" rx={3} />
              {b.overtime > 0 && <rect x={x} y={yOt} width={BAR_W} height={otH} fill="#f59e0b" rx={3} />}
              {totalH > 0 && <text x={x + BAR_W / 2} y={topLabelY} textAnchor="middle" className="fill-fg text-[9px] font-medium">{totalH}h</text>}
              <text x={x + BAR_W / 2} y={BAR_H + 16} textAnchor="middle" className="fill-muted text-[10px]">{b.label}</text>
            </g>
          );
        })}
        <line x1={0} y1={BAR_H} x2={width} y2={BAR_H} stroke="var(--border)" strokeWidth={1} />
      </svg>
      <p className="mt-1 flex gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full" style={{ background: "var(--accent)" }} /> Effectif</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-amber-500" /> Heures sup</span>
      </p>
    </div>
  );
}
