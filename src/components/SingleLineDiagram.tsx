import type { LineResult } from "@/lib/power";

// Schéma électrique 2D (unifilaire) : tableau général → lignes → départs (si divisées), avec le nombre de prises.
// Mentions standard (différentiel 30 mA, interrupteur général, magnétothermique) : hypothèses de bon sens pour une
// installation de spectacle classique, pas une donnée saisie — à vérifier sur l'installation réelle avant travaux.

type Node = { label: string; meta: string[]; level?: "ok" | "warn" | "over"; children: Node[] };

const LEVEL_BORDER = { ok: "var(--border)", warn: "#f59e0b", over: "var(--danger)" } as const;

function leafCount(n: Node): number {
  return n.children.length === 0 ? 1 : n.children.reduce((s, c) => s + leafCount(c), 0);
}

function buildTree(lines: LineResult[]): Node {
  const circuitNode = (r: LineResult): Node => {
    const tetra = r.mode === "tetra";
    const base: Node = {
      label: r.circuit.name,
      level: r.level,
      meta: [
        `${r.circuit.breakerAmps} A ${tetra ? "tétra (3P+N)" : "mono"}`,
        `Disjoncteur magnétothermique ${r.circuit.breakerAmps} A`,
        "Différentiel 30 mA",
      ],
      children: [],
    };
    if (r.feederAmps && r.feeders.length > 0) {
      base.children = r.feeders.map((fd): Node => {
        const n = fd.phases.reduce((s, ph) => s + ph.outlets.length, 0);
        return {
          label: `Départ ${fd.index}`,
          level: fd.maxPct > 100 ? "over" : fd.maxPct > 80 ? "warn" : "ok",
          meta: [
            `${r.feederAmps} A`,
            `Disjoncteur magnétothermique ${r.feederAmps} A`,
            ...(n > 0 ? [`${n} prise${n > 1 ? "s" : ""} ${r.circuit.outletAmps ?? 16} A`] : []),
          ],
          children: [],
        };
      });
    } else if (r.outletsTotal > 0) {
      base.meta.push(`${r.outletsTotal} prise${r.outletsTotal > 1 ? "s" : ""} ${r.circuit.outletAmps ?? 16} A`);
    }
    return base;
  };
  return {
    label: "Tableau général",
    meta: ["Interrupteur général (coupe-circuit)"],
    children: lines.map(circuitNode),
  };
}

const UNIT = 190; // largeur réservée par feuille, en px
const ROW = 120; // hauteur entre deux niveaux, en px
const BOX_W = 168;
const BOX_H = 72;

function layout(n: Node, x0: number, depth: number, out: { x: number; y: number; n: Node }[], lines: { x1: number; y1: number; x2: number; y2: number }[]) {
  const w = leafCount(n) * UNIT;
  const cx = x0 + w / 2;
  const cy = depth * ROW + BOX_H / 2;
  out.push({ x: cx, y: cy, n });
  let cursor = x0;
  for (const child of n.children) {
    const cw = leafCount(child) * UNIT;
    const childCx = layout(child, cursor, depth + 1, out, lines).cx;
    lines.push({ x1: cx, y1: cy + BOX_H / 2, x2: childCx, y2: (depth + 1) * ROW });
    cursor += cw;
  }
  return { cx };
}

export function SingleLineDiagram({ lines }: { lines: LineResult[] }) {
  if (lines.length === 0) return <p className="text-sm text-muted">Ajoute une ligne pour voir le schéma.</p>;
  const root = buildTree(lines);
  const totalLeaves = leafCount(root);
  const width = totalLeaves * UNIT;
  const depthCount = (n: Node): number => 1 + Math.max(0, ...n.children.map(depthCount));
  const height = depthCount(root) * ROW;

  const nodes: { x: number; y: number; n: Node }[] = [];
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  layout(root, 0, 0, nodes, edges);

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-bg">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Schéma unifilaire de l'installation" className="block">
        {edges.map((e, i) => (
          <polyline key={i} points={`${e.x1},${e.y1} ${e.x1},${(e.y1 + e.y2) / 2} ${e.x2},${(e.y1 + e.y2) / 2} ${e.x2},${e.y2}`} fill="none" stroke="var(--muted)" strokeWidth={1.5} />
        ))}
        {nodes.map(({ x, y, n }, i) => (
          <g key={i} transform={`translate(${x - BOX_W / 2}, ${y - BOX_H / 2})`}>
            <rect width={BOX_W} height={BOX_H} rx={10} fill="var(--surface)" stroke={LEVEL_BORDER[n.level ?? "ok"]} strokeWidth={n.level === "over" ? 2.5 : n.level === "warn" ? 2 : 1.5} />
            <text x={BOX_W / 2} y={18} textAnchor="middle" className="fill-fg text-[12px] font-semibold">{n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}</text>
            {n.meta.map((m, j) => (
              <text key={j} x={BOX_W / 2} y={34 + j * 13} textAnchor="middle" className="fill-muted text-[10px]">{m}</text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
