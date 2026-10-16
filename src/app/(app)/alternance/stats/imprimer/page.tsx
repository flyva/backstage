import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addDays, addMonths, dayLabel, fmtHours, isDay, isMonth, monthLabel } from "@/lib/alternance";
import { SOURCE_LABEL, rangeWeeks, summarizeWeek, sumDays, isYear, type DaySummary } from "@/lib/pointeuse";
import { fetchDaySummaries } from "@/lib/time-query";
import { resolveTimeSubject } from "@/lib/time-access";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Bilan de pointage" };

// Bilan de pointage prêt à imprimer ou à enregistrer en PDF (à remettre au référent ou à l'école).
// Regroupé par semaine complète, comme les statistiques en ligne, car les heures sup se comptent sur la semaine.
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

  const weeks = rangeWeeks(from, to);
  const summaries = await fetchDaySummaries(subject.userId, weeks[0][0], weeks[weeks.length - 1][6], today, subject.workDaysPerWeek);
  const byDay = new Map(summaries.map((s) => [s.day, s]));
  const inPeriod = (d: string) => d >= from && d <= to;
  const total = sumDays(summaries.filter((s) => inPeriod(s.day)));
  const weekRows = weeks.map((week) => ({
    week,
    days: week.map((d) => byDay.get(d)).filter((d): d is DaySummary => !!d && inPeriod(d.day) && d.source !== "futur"),
    wk: summarizeWeek(week.map((d) => byDay.get(d)).filter((d): d is DaySummary => !!d), subject.standardWorkMinutes, subject.workDaysPerWeek),
  })).filter((w) => w.days.length > 0);
  const overtimeMinutes = weekRows.reduce((s, w) => s + w.wk.overtimeMinutes, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/alternance/stats" className="text-sm text-muted hover:text-fg">← Statistiques</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold capitalize">Bilan de pointage — {title}</h1>
        <p className="text-sm text-muted">{subject.name} · {total.days} jour(s) travaillé(s) · {fmtHours(total.effectiveMinutes)} effectif · {fmtHours(overtimeMinutes)} heures sup · {fmtHours(total.pauseMinutes)} pause</p>
        <p className="text-xs text-muted">Les heures sup se comptent par semaine complète (au-delà de {fmtHours(subject.standardWorkMinutes * subject.workDaysPerWeek)}), pas jour par jour.</p>
      </header>
      {weekRows.map(({ week, days, wk }) => (
        <table key={week[0]} className="w-full break-inside-avoid text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-1.5 pr-3 font-medium">Semaine du {dayLabel(week[0])}</th><th className="py-1.5 pr-3 font-medium">Statut</th><th className="py-1.5 pr-3 font-medium">Horaires</th><th className="py-1.5 pr-3 font-medium">Pause</th><th className="py-1.5 pr-3 font-medium">Effectif</th><th className="py-1.5 font-medium">Commentaire</th></tr></thead>
          <tbody className="divide-y divide-line">
            {days.map((s) => (
              <tr key={s.day}>
                <td className="py-1 pr-3 capitalize">{dayLabel(s.day)}</td>
                <td className="py-1 pr-3">{SOURCE_LABEL[s.source]}</td>
                <td className="py-1 pr-3 tabular-nums">{s.entries.length > 0 ? s.entries.map((e) => `${String(Math.floor(e.startMinutes / 60)).padStart(2, "0")}:${String(e.startMinutes % 60).padStart(2, "0")}–${String(Math.floor(e.endMinutes / 60)).padStart(2, "0")}:${String(e.endMinutes % 60).padStart(2, "0")}${e.endDay > s.day ? " (+1j)" : ""}`).join(", ") : "—"}</td>
                <td className="py-1 pr-3 tabular-nums">{s.pauseMinutes > 0 ? fmtHours(s.pauseMinutes) : "—"}</td>
                <td className="py-1 pr-3 tabular-nums">{s.effectiveMinutes > 0 ? fmtHours(s.effectiveMinutes) : "—"}</td>
                <td className="py-1 text-muted">{s.entries.map((e) => e.comment).filter(Boolean).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-line font-medium"><td className="py-1.5 pr-3" colSpan={3}>Total semaine</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(wk.pauseMinutes)}</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(wk.effectiveMinutes)}</td><td className="py-1.5 text-amber-700">{wk.overtimeMinutes > 0 ? `${fmtHours(wk.overtimeMinutes)} de sup` : ""}</td></tr></tfoot>
        </table>
      ))}
      <table className="w-full text-sm">
        <tfoot><tr className="border-t-2 border-line font-semibold"><td className="py-1.5 pr-3" style={{ width: "40%" }}>Total {title}</td><td className="py-1.5 pr-3 tabular-nums" style={{ width: "15%" }}>{fmtHours(total.pauseMinutes)} pause</td><td className="py-1.5 pr-3 tabular-nums" style={{ width: "15%" }}>{fmtHours(total.effectiveMinutes)} effectif</td><td className="py-1.5 tabular-nums text-amber-700" style={{ width: "15%" }}>{fmtHours(overtimeMinutes)} sup</td></tr></tfoot>
      </table>
    </div>
  );
}
