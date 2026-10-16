import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Printer, Table2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addDays, addMonths, dayLabel, fmtHours, isDay, isMonth, monthGrid, monthLabel } from "@/lib/alternance";
import { SOURCE_CLASS, SOURCE_LABEL, isYear, monthWeeks, monthsOfYear, rangeWeeks, summarizeWeek, sumDays, type DaySummary, type Totals } from "@/lib/pointeuse";
import { fetchDaySummaries } from "@/lib/time-query";
import { resolveTimeSubject, tutees, type TimeSubject } from "@/lib/time-access";
import { TimeBarChart, type ChartBar } from "@/components/TimeCharts";

export const metadata = { title: "Statistiques de pointage" };

type Mode = "month" | "year" | "range";

const qs = (params: Record<string, string | undefined>) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `?${s}` : "";
};

export default async function StatsPage({ searchParams }: PageProps<"/alternance/stats">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayParis();
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);

  const asParam = typeof sp.as === "string" ? sp.as : undefined;
  const subject = await resolveTimeSubject(user, asParam);
  const mine = await tutees(user.id);

  const mode: Mode = sp.mode === "year" ? "year" : sp.mode === "range" ? "range" : "month";
  const view: "table" | "calendar" = sp.view === "calendar" ? "calendar" : "table";
  const base = { as: subject.readonly ? String(subject.userId) : undefined };

  return (
    <div className="space-y-6">
      {(mine.length > 0 || subject.readonly) && (
        <section className="card flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{subject.readonly ? `Tu regardes la pointeuse de ${subject.name} (lecture seule).` : "Tu vois aussi, en tant que référent :"}</span>
          {subject.readonly && <Link href="/alternance/stats" className="btn-ghost text-xs">← Revenir à mes stats</Link>}
          {!subject.readonly && mine.map((t) => <Link key={t.id} href={`/alternance/stats${qs({ as: String(t.id) })}`} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-accent">{t.name}</Link>)}
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5 text-sm">
            {(["month", "year", "range"] as Mode[]).map((m) => (
              <Link key={m} href={`/alternance/stats${qs({ ...base, mode: m === "month" ? undefined : m })}`} className={`rounded-full px-3 py-1 font-medium ${mode === m ? "bg-accent text-accent-fg" : "border border-line text-muted hover:text-fg"}`}>
                {m === "month" ? "Mois" : m === "year" ? "Année" : "Période"}
              </Link>
            ))}
          </div>
          {mode !== "range" && (
            <div className="flex gap-1.5 text-sm">
              <Link href={`/alternance/stats${qs({ ...base, mode: mode === "year" ? "year" : undefined, view: "table" })}`} className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium ${view === "table" ? "bg-accent text-accent-fg" : "border border-line text-muted hover:text-fg"}`}><Table2 size={14} /> Tableau</Link>
              {mode === "month" && (
                <Link href={`/alternance/stats${qs({ ...base, view: "calendar" })}`} className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium ${view === "calendar" ? "bg-accent text-accent-fg" : "border border-line text-muted hover:text-fg"}`}><CalendarDays size={14} /> Calendrier</Link>
              )}
            </div>
          )}
        </div>

        {mode === "month" && <MonthStats sp={sp} today={today} currentMonth={currentMonth} base={base} view={view} subject={subject} />}
        {mode === "year" && <YearStats sp={sp} today={today} currentYear={currentYear} base={base} subject={subject} />}
        {mode === "range" && <RangeStats sp={sp} today={today} base={base} subject={subject} />}
      </section>
    </div>
  );
}

function TotalsCards({ t, overtimeMinutes }: { t: Totals; overtimeMinutes: number }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-4">
      <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">Effectif</dt><dd className="text-2xl font-bold tabular-nums">{fmtHours(t.effectiveMinutes)}</dd></div>
      <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">Heures sup</dt><dd className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmtHours(overtimeMinutes)}</dd></div>
      <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">Pause</dt><dd className="text-2xl font-bold tabular-nums">{fmtHours(t.pauseMinutes)}</dd></div>
      <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">Jours travaillés</dt><dd className="text-2xl font-bold tabular-nums">{t.days}</dd></div>
    </dl>
  );
}

function ExportLinks({ params }: { params: Record<string, string | undefined> }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/alternance/stats/export${qs(params)}`} className="btn-ghost text-xs"><Download size={14} /> Export CSV</a>
      <Link href={`/alternance/stats/imprimer${qs(params)}`} className="btn-ghost text-xs"><Printer size={14} /> Bilan (PDF)</Link>
    </div>
  );
}

function DayRow({ d, showDate = true }: { d: DaySummary; showDate?: boolean }) {
  return (
    <tr className={d.source === "futur" ? "opacity-40" : ""}>
      {showDate && <td className="py-1.5 pr-3 capitalize">{dayLabel(d.day)}</td>}
      <td className="py-1.5 pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SOURCE_CLASS[d.source]}`}>{SOURCE_LABEL[d.source]}</span></td>
      <td className="py-1.5 pr-3 tabular-nums text-muted">{d.entries.length > 0 ? d.entries.map((e) => `${Math.floor(e.startMinutes / 60)}h${String(e.startMinutes % 60).padStart(2, "0")}–${Math.floor(e.endMinutes / 60)}h${String(e.endMinutes % 60).padStart(2, "0")}${e.endDay > d.day ? " (+1j)" : ""}`).join(", ") : "—"}</td>
      <td className="py-1.5 pr-3 tabular-nums">{d.pauseMinutes > 0 ? fmtHours(d.pauseMinutes) : "—"}</td>
      <td className="py-1.5 pr-3 tabular-nums font-medium">{d.effectiveMinutes > 0 ? fmtHours(d.effectiveMinutes) : "—"}</td>
      <td className="py-1.5" aria-hidden />
    </tr>
  );
}

// Les heures sup se comptent sur la semaine ENTIÈRE (les 7 jours, même ceux du mois voisin affichés en grisé) : un jour
// chargé peut être compensé par un jour plus court la même semaine. Chaque ligne de jour garde ses propres totaux
// (effectif, pause…) ; seul le total « Sup » de la semaine est une vraie accumulation, pas une somme de dépassements journaliers.
function WeekTable({ weeks, byDay, inPeriod, standardWorkMinutes, workDaysPerWeek }: { weeks: string[][]; byDay: Map<string, DaySummary>; inPeriod: (day: string) => boolean; standardWorkMinutes: number; workDaysPerWeek: number }) {
  return (
    <div className="space-y-4">
      {weeks.map((week, i) => {
        const fullWeek = week.map((d) => byDay.get(d)).filter((d): d is DaySummary => !!d);
        const wk = summarizeWeek(fullWeek, standardWorkMinutes, workDaysPerWeek);
        return (
          <div key={i} className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="py-1.5 pl-3 pr-3 font-medium">Semaine du {dayLabel(week[0])}</th><th className="py-1.5 pr-3 font-medium">Statut</th><th className="py-1.5 pr-3 font-medium">Horaires</th><th className="py-1.5 pr-3 font-medium">Pause</th><th className="py-1.5 pr-3 font-medium">Effectif</th><th className="py-1.5 pr-3 font-medium">Sup (semaine)</th></tr></thead>
              <tbody className="divide-y divide-line px-3">
                {week.map((d) => { const s = byDay.get(d); return s ? <DayRow key={d} d={{ ...s, source: inPeriod(d) ? s.source : "futur" }} /> : null; })}
              </tbody>
              <tfoot><tr className="border-t border-line bg-bg font-medium"><td className="py-1.5 pl-3 pr-3">Total semaine</td><td /><td /><td className="py-1.5 pr-3 tabular-nums">{fmtHours(wk.pauseMinutes)}</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(wk.effectiveMinutes)}</td><td className="py-1.5 tabular-nums text-amber-600 dark:text-amber-400">{fmtHours(wk.overtimeMinutes)}</td></tr></tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function MonthCalendar({ month, today, byDay }: { month: string; today: string; byDay: Map<string, DaySummary> }) {
  const grid = monthGrid(month);
  const WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{WEEK.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map(({ day, inMonth }) => {
          const s = byDay.get(day);
          const showHours = s && inMonth && s.source !== "futur" && s.source !== "non_travaille" && s.source !== "repos" && day <= today;
          return (
            <div key={day} className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border text-sm ${s ? `${SOURCE_CLASS[s.source]} border-transparent` : "border-line"} ${inMonth ? "" : "opacity-30"} ${day === today ? "ring-2 ring-accent" : ""}`}>
              <span className="font-medium tabular-nums">{Number(day.slice(8))}</span>
              {showHours && <span className="text-[10px] leading-none tabular-nums">{fmtHours(s.effectiveMinutes)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function MonthStats({ sp, today, currentMonth, base, view, subject }: { sp: Record<string, string | string[] | undefined>; today: string; currentMonth: string; base: Record<string, string | undefined>; view: "table" | "calendar"; subject: TimeSubject }) {
  const mParam = typeof sp.m === "string" ? sp.m : undefined;
  const month = isMonth(mParam) && mParam <= currentMonth ? mParam : currentMonth;
  const weeks = monthWeeks(month);
  const from = weeks[0][0];
  const to = weeks[weeks.length - 1][6];
  const summaries = await fetchDaySummaries(subject.userId, from, to, today, subject.workDaysPerWeek);
  const byDay = new Map(summaries.map((s) => [s.day, s]));
  const inMonth = (d: string) => d.startsWith(month);
  const monthDays = summaries.filter((s) => inMonth(s.day));
  const total = sumDays(monthDays);
  const weekSums = weeks.map((w) => summarizeWeek(w.map((d) => byDay.get(d)).filter((d): d is DaySummary => !!d), subject.standardWorkMinutes, subject.workDaysPerWeek));
  const overtimeMinutes = weekSums.reduce((s, w) => s + w.overtimeMinutes, 0);
  const bars: ChartBar[] = weekSums.map((w, i) => ({ label: `S${i + 1}`, effective: w.effectiveMinutes, overtime: w.overtimeMinutes }));
  const params = { ...base, mode: undefined, m: month };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={`/alternance/stats${qs({ ...base, m: addMonths(month, -1) })}`} className="btn-ghost px-2" aria-label="Mois précédent"><ChevronLeft size={16} /></Link>
          <h3 className="w-44 text-center text-lg font-semibold capitalize">{monthLabel(month)}</h3>
          {month < currentMonth ? <Link href={`/alternance/stats${qs({ ...base, m: addMonths(month, 1) })}`} className="btn-ghost px-2" aria-label="Mois suivant"><ChevronRight size={16} /></Link> : <span className="w-8" />}
        </div>
        <ExportLinks params={params} />
      </div>
      <p className="text-xs text-muted">Les heures sup se comptent par semaine complète (effectif de la semaine au-delà de {fmtHours(subject.standardWorkMinutes * subject.workDaysPerWeek)}), pas jour par jour.</p>
      <TotalsCards t={total} overtimeMinutes={overtimeMinutes} />
      <TimeBarChart bars={bars} title="Effectif et heures sup par semaine" />
      {view === "calendar" ? <MonthCalendar month={month} today={today} byDay={byDay} /> : <WeekTable weeks={weeks} byDay={byDay} inPeriod={inMonth} standardWorkMinutes={subject.standardWorkMinutes} workDaysPerWeek={subject.workDaysPerWeek} />}
    </div>
  );
}

async function YearStats({ sp, today, currentYear, base, subject }: { sp: Record<string, string | string[] | undefined>; today: string; currentYear: string; base: Record<string, string | undefined>; subject: TimeSubject }) {
  const yParam = typeof sp.y === "string" ? sp.y : undefined;
  const year = isYear(yParam) && yParam <= currentYear ? yParam : currentYear;
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  // Semaines complètes couvrant l'année (avec un peu de débordement avant/après) : chaque semaine « appartient » au mois
  // de son lundi, pour répartir les heures sup par mois sans jamais recouper une semaine en deux.
  const weeks = rangeWeeks(from, to);
  const summaries = await fetchDaySummaries(subject.userId, weeks[0][0], weeks[weeks.length - 1][6], today, subject.workDaysPerWeek);
  const byDay = new Map(summaries.map((s) => [s.day, s]));
  const overtimeByMonth = new Map<string, number>();
  for (const week of weeks) {
    const wk = summarizeWeek(week.map((d) => byDay.get(d)).filter((d): d is DaySummary => !!d), subject.standardWorkMinutes, subject.workDaysPerWeek);
    const owner = week[0].slice(0, 7);
    overtimeByMonth.set(owner, (overtimeByMonth.get(owner) ?? 0) + wk.overtimeMinutes);
  }
  const months = monthsOfYear(year);
  const perMonth = months.map((m) => ({ m, t: sumDays(summaries.filter((s) => s.day.startsWith(m))), overtime: overtimeByMonth.get(m) ?? 0 }));
  const total = sumDays(summaries.filter((s) => s.day >= from && s.day <= to));
  const overtimeMinutes = perMonth.reduce((s, p) => s + p.overtime, 0);
  const bars: ChartBar[] = perMonth.map(({ m, t, overtime }) => ({ label: m.slice(5), effective: t.effectiveMinutes, overtime }));
  const params = { ...base, mode: "year", y: year };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={`/alternance/stats${qs({ ...base, mode: "year", y: String(Number(year) - 1) })}`} className="btn-ghost px-2" aria-label="Année précédente"><ChevronLeft size={16} /></Link>
          <h3 className="w-28 text-center text-lg font-semibold">{year}</h3>
          {year < currentYear ? <Link href={`/alternance/stats${qs({ ...base, mode: "year", y: String(Number(year) + 1) })}`} className="btn-ghost px-2" aria-label="Année suivante"><ChevronRight size={16} /></Link> : <span className="w-8" />}
        </div>
        <ExportLinks params={params} />
      </div>
      <p className="text-xs text-muted">Les heures sup se comptent par semaine complète ; chaque semaine est rattachée au mois de son lundi.</p>
      <TotalsCards t={total} overtimeMinutes={overtimeMinutes} />
      <TimeBarChart bars={bars} title="Effectif et heures sup par mois" />
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="py-1.5 pl-3 pr-3 font-medium">Mois</th><th className="py-1.5 pr-3 font-medium">Effectif</th><th className="py-1.5 pr-3 font-medium">Sup</th><th className="py-1.5 pr-3 font-medium">Pause</th><th className="py-1.5 pr-3 font-medium">Jours</th></tr></thead>
          <tbody className="divide-y divide-line">
            {perMonth.map(({ m, t, overtime }) => (
              <tr key={m}>
                <td className="py-1.5 pl-3 pr-3 capitalize"><Link href={`/alternance/stats${qs({ ...base, m })}`} className="text-accent hover:underline">{monthLabel(m)}</Link></td>
                <td className="py-1.5 pr-3 tabular-nums font-medium">{fmtHours(t.effectiveMinutes)}</td>
                <td className="py-1.5 pr-3 tabular-nums text-amber-600 dark:text-amber-400">{fmtHours(overtime)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{fmtHours(t.pauseMinutes)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{t.days}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-line bg-bg font-medium"><td className="py-1.5 pl-3 pr-3">Total {year}</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(total.effectiveMinutes)}</td><td className="py-1.5 pr-3 tabular-nums text-amber-600 dark:text-amber-400">{fmtHours(overtimeMinutes)}</td><td className="py-1.5 pr-3 tabular-nums">{fmtHours(total.pauseMinutes)}</td><td className="py-1.5 pr-3 tabular-nums">{total.days}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}

async function RangeStats({ sp, today, base, subject }: { sp: Record<string, string | string[] | undefined>; today: string; base: Record<string, string | undefined>; subject: TimeSubject }) {
  const fromParam = typeof sp.from === "string" ? sp.from : undefined;
  const toParam = typeof sp.to === "string" ? sp.to : undefined;
  const to = isDay(toParam) && toParam <= today ? toParam : today;
  let from = isDay(fromParam) && fromParam <= to ? fromParam : addDays(to, -29);
  if (addDays(from, 400) < to) from = addDays(to, -400); // période trop longue : on la limite à 400 jours
  const weeks = rangeWeeks(from, to);
  const summaries = await fetchDaySummaries(subject.userId, weeks[0][0], weeks[weeks.length - 1][6], today, subject.workDaysPerWeek);
  const byDay = new Map(summaries.map((s) => [s.day, s]));
  const inPeriod = (d: string) => d >= from && d <= to;
  const total = sumDays(summaries.filter((s) => inPeriod(s.day)));
  const weekSums = weeks.map((w) => summarizeWeek(w.map((d) => byDay.get(d)).filter((d): d is DaySummary => !!d), subject.standardWorkMinutes, subject.workDaysPerWeek));
  const overtimeMinutes = weekSums.reduce((s, w) => s + w.overtimeMinutes, 0);
  const bars: ChartBar[] = weekSums.map((w, i) => ({ label: `S${i + 1}`, effective: w.effectiveMinutes, overtime: w.overtimeMinutes }));
  const params = { ...base, mode: "range", from, to };

  return (
    <div className="space-y-4 pt-1">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="mode" value="range" />
        {base.as && <input type="hidden" name="as" value={base.as} />}
        <div><label className="label" htmlFor="st-from">Du</label><input id="st-from" name="from" type="date" defaultValue={from} max={today} required className="input" /></div>
        <div><label className="label" htmlFor="st-to">Au</label><input id="st-to" name="to" type="date" defaultValue={to} max={today} required className="input" /></div>
        <button className="btn">Afficher</button>
        <div className="ml-auto"><ExportLinks params={params} /></div>
      </form>
      <p className="text-xs text-muted">Les heures sup se comptent par semaine complète, pas jour par jour.</p>
      <TotalsCards t={total} overtimeMinutes={overtimeMinutes} />
      <TimeBarChart bars={bars} title="Effectif et heures sup par semaine" />
      <WeekTable weeks={weeks} byDay={byDay} inPeriod={inPeriod} standardWorkMinutes={subject.standardWorkMinutes} workDaysPerWeek={subject.workDaysPerWeek} />
    </div>
  );
}
