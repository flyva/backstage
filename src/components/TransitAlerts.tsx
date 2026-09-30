import { AlertTriangle, Info } from "lucide-react";
import type { PlaceAlert } from "@/lib/alerts";

const untilFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Alertes TBM (travaux, déviations, lignes perturbées) : titre, lignes concernées, détail au clic. */
export function TransitAlerts({ alerts, max = 4, title = "Alertes TBM" }: { alerts: PlaceAlert[]; max?: number; title?: string }) {
  if (alerts.length === 0) return null;
  const shown = alerts.slice(0, max);
  const rest = alerts.slice(max);
  const item = (a: PlaceAlert, i: number) => (
    <li key={`${a.title}-${i}`} className="text-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-2">
          {a.kind === "perturbation" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#f59e0b]" aria-label="Perturbation" /> : <Info size={16} className="mt-0.5 shrink-0 text-muted" aria-label="Information" />}
          <span className="min-w-0 flex-1">
            <span className="font-medium">{a.title}</span>
            <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
              {[...new Set(a.codes)].slice(0, 6).map((c) => <span key={c} className="rounded-md border border-line px-1.5 text-[11px] font-bold">{c}</span>)}
            </span>
            {a.until && <span className="block text-xs text-muted">jusqu&apos;au {untilFmt.format(a.until)}</span>}
          </span>
        </summary>
        {a.detail && <p className="mt-1 whitespace-pre-line pl-6 text-xs leading-relaxed text-muted">{a.detail}</p>}
      </details>
    </li>
  );
  return (
    <div className="space-y-2 rounded-xl border border-line bg-bg p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={16} className="text-[#f59e0b]" /> {title} ({alerts.length})</h3>
      <ul className="space-y-2.5">{shown.map(item)}</ul>
      {rest.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-muted underline">Voir les {rest.length} autre{rest.length > 1 ? "s" : ""}</summary>
          <ul className="mt-2.5 space-y-2.5">{rest.map((a, i) => item(a, i + max))}</ul>
        </details>
      )}
    </div>
  );
}
