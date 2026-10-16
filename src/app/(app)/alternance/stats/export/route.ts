import { getUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addDays, addMonths, isDay, isMonth, fmtHours } from "@/lib/alternance";
import { SOURCE_LABEL, isYear } from "@/lib/pointeuse";
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

  const summaries = await fetchDaySummaries(subject.userId, from, to, today, subject.standardWorkMinutes);
  const csv = toCsv(
    ["Date", "Statut", "Début", "Fin", "Date de fin (si après minuit)", "Pause (min)", "Effectif", "Heures sup", "Commentaire"],
    summaries.flatMap((s) => {
      if (s.entries.length === 0) {
        if (s.source === "futur") return [];
        return [[s.day, SOURCE_LABEL[s.source], "", "", "", s.pauseMinutes, fmtHours(s.effectiveMinutes), fmtHours(s.overtimeMinutes), ""]];
      }
      return s.entries.map((e) => [
        s.day, SOURCE_LABEL[s.source],
        `${String(Math.floor(e.startMinutes / 60)).padStart(2, "0")}:${String(e.startMinutes % 60).padStart(2, "0")}`,
        `${String(Math.floor(e.endMinutes / 60)).padStart(2, "0")}:${String(e.endMinutes % 60).padStart(2, "0")}`,
        e.endDay > s.day ? e.endDay : "",
        e.pauseMinutes, fmtHours(s.effectiveMinutes), fmtHours(s.overtimeMinutes), e.comment ?? "",
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
