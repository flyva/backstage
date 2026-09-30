"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp } from "lucide-react";
import { importCalendar } from "@/lib/alternance-actions";
import { KIND_CLASS, monthLabel } from "@/lib/alternance";
import type { WorkKind } from "@/db/schema";

type Preview = {
  days: { day: string; kind: WorkKind }[];
  from: string;
  to: string;
  counts: { ecole: number; entreprise: number; ferie: number };
  warnings: string[];
};

// Import du calendrier de formation de l'école (PDF) : on envoie le fichier, on montre ce qui a été lu (par mois), puis on importe.
export function CalendarImport() {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const analyse = async (file: File) => {
    setBusy(true);
    setError(null);
    setPreview(null);
    setDone(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/alternance/calendar", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as Partial<Preview> & { error?: string };
      if (!res.ok || !data.days) setError(data.error ?? "Lecture impossible");
      else setPreview(data as Preview);
    } catch {
      setError("Envoi impossible");
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  };

  const byMonth = new Map<string, { ecole: number; entreprise: number; ferie: number }>();
  for (const d of preview?.days ?? []) {
    const m = d.day.slice(0, 7);
    const o = byMonth.get(m) ?? { ecole: 0, entreprise: 0, ferie: 0 };
    if (d.kind in o) o[d.kind as keyof typeof o]++;
    byMonth.set(m, o);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn" disabled={busy} onClick={() => picker.current?.click()}>
          <FileUp size={16} /> {busy ? "Lecture du PDF…" : "Choisir le calendrier (PDF)"}
        </button>
        <input ref={picker} type="file" hidden accept="application/pdf,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyse(f); }} />
        <p className="text-xs text-muted">Le calendrier de formation donné par l&apos;école (un mois par colonne, cases colorées). Rien n&apos;est enregistré avant ta confirmation.</p>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {done && <p className="text-sm text-green-600 dark:text-green-400" role="status">{done}</p>}

      {preview && (
        <div className="space-y-3 rounded-xl border border-line p-4">
          <p className="text-sm font-medium">
            Calendrier lu : du {preview.from} au {preview.to} —{" "}
            <span className={`rounded-full px-2 py-0.5 text-xs ${KIND_CLASS.ecole}`}>{preview.counts.ecole} jours à l&apos;école</span>{" "}
            <span className={`rounded-full px-2 py-0.5 text-xs ${KIND_CLASS.entreprise}`}>{preview.counts.entreprise} jours en entreprise</span>{" "}
            <span className={`rounded-full px-2 py-0.5 text-xs ${KIND_CLASS.ferie}`}>{preview.counts.ferie} fériés</span>
          </p>
          {preview.warnings.length > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{preview.warnings.join(" ")}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-96 text-sm">
              <thead className="text-xs text-muted"><tr><th className="py-1 text-left font-medium">Mois</th><th className="text-right font-medium">École</th><th className="text-right font-medium">Entreprise</th><th className="text-right font-medium">Fériés</th></tr></thead>
              <tbody className="divide-y divide-line">
                {[...byMonth].map(([m, c]) => (
                  <tr key={m}><td className="py-1 capitalize">{monthLabel(m)}</td><td className="text-right tabular-nums">{c.ecole || "–"}</td><td className="text-right tabular-nums">{c.entreprise || "–"}</td><td className="text-right tabular-nums">{c.ferie || "–"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">L&apos;import remplace les jours école / entreprise / férié déjà saisis sur cette période. Tes congés sont conservés. Vérifie que les totaux du mois correspondent au PDF avant d&apos;importer.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => start(async () => {
                const res = await importCalendar(JSON.stringify(preview.days));
                if (res?.error) setError(res.error);
                else { setDone(res?.ok ?? "Importé"); setPreview(null); }
              })}
            >
              {pending ? "Import…" : "Importer dans mon planning"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
