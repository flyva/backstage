// Pictogrammes courants sur le matériel électrique, en SVG simple (suit le thème clair/sombre via currentColor).

function Terre() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="12" y1="3" x2="12" y2="12" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
      <line x1="9" y1="20" x2="15" y2="20" />
    </svg>
  );
}

function ClasseII() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <rect x="7" y="7" width="10" height="10" rx="0.5" />
    </svg>
  );
}

function RisqueElectrique() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 2 20h20L12 2Z" />
      <path d="M13 8l-4 6h3l-1 4 4-6h-3l1-4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CE() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
      <text x="12" y="17" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="sans-serif">CE</text>
    </svg>
  );
}

const SYMBOLS = [
  { Icon: Terre, label: "Mise à la terre", hint: "Relié à la terre (PE) : protège en cas de défaut d'isolement." },
  { Icon: ClasseII, label: "Classe II", hint: "Double isolation : pas besoin de mise à la terre." },
  { Icon: RisqueElectrique, label: "Risque électrique", hint: "Danger : pièce sous tension à proximité." },
  { Icon: CE, label: "Marquage CE", hint: "L'appareil respecte les normes européennes (pas un gage de qualité, une obligation légale)." },
];

export function ElectricalSymbols() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {SYMBOLS.map(({ Icon, label, hint }) => (
        <li key={label} className="flex items-start gap-3 rounded-xl border border-line bg-bg p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line text-fg"><Icon /></span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-xs text-muted">{hint}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
