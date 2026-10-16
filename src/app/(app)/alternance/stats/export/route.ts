import { getUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addDays, addMonths, isDay, isMonth, fmtHours } from "@/lib/alternance";
import { SOURCE_LABEL, isYear, rangeWeeks, summarizeWeek, type DaySummary } from "@/lib/pointeuse";
import { fetchDaySummaries } from "@/lib/time-query";
import { resolveTimeSubject } from "@/lib/time-access";
import { toCsv } from "@/lib/csv";

// Export CSV du bilan de pointage (jour par jour) : un mois, une année, ou une période.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const today = todayParis();
  const asParam = sp.get("as") ?? undefined;
  const subject = await resolveTimeSubject(user, asParam);

  const mode = sp.get("mode") === "year" ? "year" : sp.get("mode") === "range" ? "range" : "month";
  let from: string, to: string, label: string;
  if (mode === "year") {
    const y = sp.get("y");
    const year = isYear(y) && y <= today.slice(0, 4) ? y : today.slice(0, 4);
    from = `${year}-01-01`; to = `${year}-12-31`; label = year;
  } else if (mode === "range") {
    const f = sp.get("from"); const t = sp.get("to");
    to = isDay(t) && t <= today ? t : today;
    from = isDay(f) && f <= to ? f : to;
    label = `${from}_${to}`;
  } else {
    const m = sp.get("m");
    const month = isMonth(m) && m <= today.slice(0, 7) ? m : today.slice(0, 7);
    from = `${month}-01`; to = addDays(addMonths(month, 1) + "-01", -1); label = month;
  }

  // Les heures sup se comptent par semaine complète (voir src/lib/pointeuse.ts) : on va chercher quelques jours de plus
  // avant/après si besoin pour compléter la première et la dernière semaine, puis on reporte le total de la semaine sur
  // chacun de ses jours dans l'export (répété, pour rester lisible ligne par ligne).
  const weeks = rangeWeeks(from, to);
  const summaries = await fetchDaySummaries(subject.userId, weeks[0][0], weeks[weeks.length - 1][6], today, subject.workDaysPerWeek);
  const byDay = new Map(summaries.map((s) => [s.day, s]));
  const overtimeByDay = new Map<string, number>();
  for (const week of weeks) {
    const wk = summarizeWeek(week.map((d) => byDay.get(d)).filter((d): d is DaySummary => !!d), subject.standardWorkMinutes, subject.workDaysPerWeek);
    for (const d of week) overtimeByDay.set(d, wk.overtimeMinutes);
  }
  const inPeriod = summaries.filter((s) => s.day >= from && s.day <= to);

  const csv = toCsv(
    ["Date", "Statut", "Début", "Fin", "Date de fin (si après minuit)", "Pause (min)", "Effectif", "Heures sup (semaine)", "Commentaire"],
    inPeriod.flatMap((s) => {
      const weekOvertime = fmtHours(overtimeByDay.get(s.day) ?? 0);
      if (s.entries.length === 0) {
        if (s.source === "futur") return [];
        return [[s.day, SOURCE_LABEL[s.source], "", "", "", s.pauseMinutes, fmtHours(s.effectiveMinutes), weekOvertime, ""]];
      }
      return s.entries.map((e) => [
        s.day, SOURCE_LABEL[s.source],
        `${String(Math.floor(e.startMinutes / 60)).padStart(2, "0")}:${String(e.startMinutes % 60).padStart(2, "0")}`,
        `${String(Math.floor(e.endMinutes / 60)).padStart(2, "0")}:${String(e.endMinutes % 60).padStart(2, "0")}`,
        e.endDay > s.day ? e.endDay : "",
        e.pauseMinutes, fmtHours(s.effectiveMinutes), weekOvertime, e.comment ?? "",
      ]);
    }),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pointeuse-${label}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
