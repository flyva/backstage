// Graphique en barres (SVG, sans dépendance) : crédits / débits par mois — même info que le graphique Chart.js d'Oasis.
import type { MonthRow } from "@/lib/finance";

const MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
const BAR_H = 120;
const BAR_W = 14;
const BAR_GAP = 3;
const GROUP_GAP = 16;

export function FinanceChart({ byMonth }: { byMonth: MonthRow[] }) {
  const max = Math.max(1, ...byMonth.flatMap((m) => [m.incomeCents, m.expenseCents]));
  const groupW = BAR_W * 2 + BAR_GAP;
  const width = byMonth.length * (groupW + GROUP_GAP) + GROUP_GAP;
  const height = BAR_H + 30;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-bg p-3">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Crédits et débits par mois" className="block">
        {byMonth.map((m, i) => {
          const x = GROUP_GAP + i * (groupW + GROUP_GAP);
          const incH = (m.incomeCents / max) * BAR_H;
          const expH = (m.expenseCents / max) * BAR_H;
          return (
            <g key={i}>
              <rect x={x} y={BAR_H - incH} width={BAR_W} height={incH} fill="#22c55e" rx={2} />
              <rect x={x + BAR_W + BAR_GAP} y={BAR_H - expH} width={BAR_W} height={expH} fill="#ef4444" rx={2} />
              <text x={x + groupW / 2} y={BAR_H + 14} textAnchor="middle" className="fill-muted text-[9px]">{MONTHS[i]}</text>
            </g>
          );
        })}
        <line x1={0} y1={BAR_H} x2={width} y2={BAR_H} stroke="var(--border)" strokeWidth={1} />
      </svg>
      <p className="mt-1 flex gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-[#22c55e]" /> Crédits</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-[#ef4444]" /> Débits</span>
      </p>
    </div>
  );
}
