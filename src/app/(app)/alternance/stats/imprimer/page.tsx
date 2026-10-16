import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addDays, addMonths, dayLabel, fmtHours, isDay, isMonth, monthLabel } from "@/lib/alternance";
import { SOURCE_LABEL, isYear, sumDays } from "@/lib/pointeuse";
import { fetchDaySummaries } from "@/lib/time-query";
import { resolveTimeSubject } from "@/lib/time-access";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Bilan de pointage" };

// Bilan de pointage prêt à imprimer ou à enregistrer en PDF (à remettre au référent ou à l'école).
export default async function StatsPrintPage({ searchParams }: PageProps<"/alternance/stats/imprimer">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayParis();
  const subject = await resolveTimeSubject(user, typeof sp.as === "string" ? sp.as : undefined);

  const mode = sp.mode === "year" ? "year" : sp.mode === "range" ? "range" : "month";
  let from: string, to: string, title: string;
  if (mode === "year") {
    const y = typeof sp.y === "string" ? sp.y : undefined;
    const year = isYear(y) && y <= today.slice(0, 4) ? y : today.slice(0, 4);
    from = `${year}-01-01`; to = `${year}-12-31`; title = year;
  } else if (mode === "range") {
    const f = typeof sp.from === "string" ? sp.from : undefined;
    const t = typeof sp.to === "string" ? sp.to : undefined;
    to = isDay(t) && t <= today ? t : today;
    from = isDay(f) && f <= to ? f : addDays(to, -29);
    title = `du ${dayLabel(from)} au ${dayLabel(to)}`;
  } else {
    const m = typeof sp.m === "string" ? sp.m : undefined;
    const month = isMonth(m) && m <= today.slice(0, 7) ? m : today.slice(0, 7);
    from = `${month}-01`; to = addDays(addMonths(month, 1) + "-01", -1); title = monthLabel(month);
  }

  const summaries = await fetchDaySummaries(subject.userId, from, to, today, subject.standardWorkMinutes);
  const withData = summaries.filter((s) => s.source !== "futur");
  const total = sumDays(withData);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/alternance/stats" className="text-sm text-muted hover:text-fg">← Statistiques</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold capitalize">Bilan de pointage — {title}</h1>
        <p className="text-sm text-muted">{subject.name} · {total.days} jour(s) travaillé(s) · {fmtHours(total.effectiveMinutes)} effectif · {fmtHours(total.overtimeMinutes)} heures sup · {fmtHours(total.pauseMinutes)} pause</p>
      </header>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-1.5 pr-3 font-medium">Date</th><th className="py-1.5 pr-3 font-medium">Statut</th><th className="py-1.5 pr-3 font-medium">Horaires</th><th className="py-1.5 pr-3 font-medium">Pause</th><th className="py-1.5 pr-3 font-medium">Effectif</th><th className="py-1.5 pr-3 font-medium">Sup</th><th className="py-1.5 font-medium">Commentaire</th></tr></thead>
        <tbody className="divide-y divide-line">
          {withData.map((s) => (
            <tr key={s.day} className="break-inside-avoid">
              <td className="py-1 pr-3 capitalize">{dayLabel(s.day)}</td>
              <td className="py-1 pr-3">{SOURCE_LABEL[s.source]}</td>
              <td className="py-1 pr-3 tabular-nums">{s.entries.length > 0 ? s.entries.map((e) => `${String(Math.floor(e.startMinutes / 60)).padStart(2, "0")}:${String(e.startMinutes % 60).padStart(2, "0")}–${String(Math.floor(e.endMinutes / 60)).padStart(2, "0")}:${String(e.endMinutes % 60).padStart(2, "0")}`).join(", ") : "—"}</td>
              <td className="py-1 pr-3 tabular-nums">{s.pauseMinutes > 0 ? fmtHours(s.pauseMinutes) : "—"}</td>
              <td className="py-1 pr-3 tabular-nums">{s.effectiveMinutes > 0 ? fmtHours(s.effectiveMinutes) : "—"}</td>
              <td className="py-1 pr-3 tabular-nums">{s.overtimeMinutes > 0 ? fmtHours(s.overtimeMinutes) : "—"}</td>
              <td className="py-1 text-muted">{s.entries.map((e) => e.comment).filter(Boolean).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="border-t border-line font-medium"><td className="py-1.5 pr-3" colSpan={3}>Total</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(total.pauseMinutes)}</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(total.effectiveMinutes)}</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(total.overtimeMinutes)}</td><td /></tr></tfoot>
      </table>
    </div>
  );
}
