import Link from "next/link";
import { and, asc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { workLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addDays, addMonths, dayLabel, fmtHours, isMonth, monthLabel } from "@/lib/alternance";
import { SOURCE_LABEL, rangeWeeks, summarizeWeek, sumDays, type DaySummary } from "@/lib/pointeuse";
import { fetchDaySummaries } from "@/lib/time-query";
import { resolveTimeSubject } from "@/lib/time-access";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Dossier du mois" };

// Dossier complet du mois, prêt à imprimer ou enregistrer en PDF en une fois : carnet de compétences + pointeuse,
// à remettre au tuteur ou à l'école (plutôt que les deux exports séparés).
export default async function MonthlyFilePage({ searchParams }: PageProps<"/alternance/dossier">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayParis();
  const month = isMonth(sp.m) && sp.m <= today.slice(0, 7) ? sp.m : today.slice(0, 7);
  const subject = await resolveTimeSubject(user, undefined);

  const logs = await db.select().from(workLogs).where(and(eq(workLogs.userId, user.id), like(workLogs.day, `${month}-%`))).orderBy(asc(workLogs.day), asc(workLogs.id));
  const skills = [...new Set(logs.flatMap((l) => l.skills?.split(",") ?? []))];
  const period = (l: { day: string; endDay: string }) => (l.day === l.endDay ? dayLabel(l.day) : `${dayLabel(l.day)} → ${dayLabel(l.endDay)}`);

  const from = `${month}-01`;
  const to = addDays(addMonths(month, 1) + "-01", -1);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/alternance" className="text-sm text-muted hover:text-fg">← Alternance</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold capitalize">Dossier d&apos;alternance — {monthLabel(month)}</h1>
        <p className="text-sm text-muted">{user.name} · {logs.length} entrée(s) de carnet · {total.days} jour(s) de pointage</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Carnet de compétences</h2>
        {skills.length > 0 && <p className="text-sm">Compétences : {skills.join(", ")}</p>}
        {logs.length === 0 && <p className="text-sm text-muted">Aucune entrée ce mois-ci.</p>}
        {logs.map((l) => (
          <article key={l.id} className="break-inside-avoid space-y-1 border-b border-line pb-3">
            <h3 className="font-semibold capitalize">{period(l)} <span className="font-normal text-muted">· {l.place === "ecole" ? "École" : "Entreprise"}</span></h3>
            <Markdown breaks>{l.mission}</Markdown>
            {l.skills && <p className="text-xs text-muted">Compétences : {l.skills.replaceAll(",", ", ")}</p>}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pointeuse</h2>
        <p className="text-sm text-muted">{fmtHours(total.effectiveMinutes)} effectif · {fmtHours(overtimeMinutes)} heures sup · {fmtHours(total.pauseMinutes)} pause</p>
        {weekRows.map(({ week, days, wk }) => (
          <table key={week[0]} className="w-full break-inside-avoid text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-1.5 pr-3 font-medium">Semaine du {dayLabel(week[0])}</th><th className="py-1.5 pr-3 font-medium">Statut</th><th className="py-1.5 pr-3 font-medium">Horaires</th><th className="py-1.5 pr-3 font-medium">Pause</th><th className="py-1.5 pr-3 font-medium">Effectif</th></tr></thead>
            <tbody className="divide-y divide-line">
              {days.map((s) => (
                <tr key={s.day}>
                  <td className="py-1 pr-3 capitalize">{dayLabel(s.day)}</td>
                  <td className="py-1 pr-3">{SOURCE_LABEL[s.source]}</td>
                  <td className="py-1 pr-3 tabular-nums">{s.entries.length > 0 ? s.entries.map((e) => `${String(Math.floor(e.startMinutes / 60)).padStart(2, "0")}:${String(e.startMinutes % 60).padStart(2, "0")}–${String(Math.floor(e.endMinutes / 60)).padStart(2, "0")}:${String(e.endMinutes % 60).padStart(2, "0")}${e.endDay > s.day ? " (+1j)" : ""}`).join(", ") : "—"}</td>
                  <td className="py-1 pr-3 tabular-nums">{s.pauseMinutes > 0 ? fmtHours(s.pauseMinutes) : "—"}</td>
                  <td className="py-1 pr-3 tabular-nums">{s.effectiveMinutes > 0 ? fmtHours(s.effectiveMinutes) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-line font-medium"><td className="py-1.5 pr-3" colSpan={3}>Total semaine</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(wk.pauseMinutes)}</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(wk.effectiveMinutes)}</td></tr></tfoot>
          </table>
        ))}
      </section>
    </div>
  );
}
