import Link from "next/link";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { workDays, type WorkKind } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { KIND_CLASS, KIND_LABEL, addMonths, isMonth, isWeekend, monthGrid, monthLabel } from "@/lib/alternance";
import { cycleDay } from "@/lib/alternance-actions";
import { RangeForm, RhythmForm } from "@/components/alternance-forms";

export const metadata = { title: "Planning de l'alternance" };

const WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default async function AlternancePage({ searchParams }: PageProps<"/alternance">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayParis();
  const month = isMonth(sp.m) ? sp.m : today.slice(0, 7);
  const grid = monthGrid(month);

  const rows = await db
    .select()
    .from(workDays)
    .where(and(eq(workDays.userId, user.id), gte(workDays.day, grid[0].day), lte(workDays.day, grid[grid.length - 1].day)))
    .orderBy(asc(workDays.day));
  const kindOf = new Map(rows.map((r) => [r.day, r.kind]));

  const count = (k: WorkKind) => rows.filter((r) => r.kind === k && r.day.startsWith(month)).length;

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={`?m=${addMonths(month, -1)}`} className="btn-ghost px-2" aria-label="Mois précédent"><ChevronLeft size={16} /></Link>
            <h2 className="w-44 text-center text-lg font-semibold capitalize">{monthLabel(month)}</h2>
            <Link href={`?m=${addMonths(month, 1)}`} className="btn-ghost px-2" aria-label="Mois suivant"><ChevronRight size={16} /></Link>
            {month !== today.slice(0, 7) && <Link href="?" className="btn-ghost ml-2 text-xs">Aujourd&apos;hui</Link>}
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(KIND_LABEL) as WorkKind[]).map((k) => (
              <li key={k} className={`rounded-full px-2.5 py-1 font-medium ${KIND_CLASS[k]}`}>{KIND_LABEL[k]} : {count(k)} j</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">{WEEK.map((d) => <div key={d}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map(({ day, inMonth }) => {
            const kind = kindOf.get(day);
            return (
              <form key={day} action={cycleDay}>
                <input type="hidden" name="day" value={day} />
                <button
                  className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition hover:border-accent ${kind ? `${KIND_CLASS[kind]} border-transparent` : "border-line"} ${inMonth ? "" : "opacity-40"} ${day === today ? "ring-2 ring-accent" : ""} ${!kind && isWeekend(day) ? "bg-bg" : ""}`}
                  aria-label={`${day} : ${kind ? KIND_LABEL[kind] : "libre"}`}
                >
                  <span className="font-medium tabular-nums">{Number(day.slice(8))}</span>
                  {kind && <span className="text-[10px] leading-none">{KIND_LABEL[kind]}</span>}
                </button>
              </form>
            );
          })}
        </div>
        <p className="text-xs text-muted">Clique sur un jour pour changer son type : libre → école → entreprise → congé → férié → libre.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Planifier un rythme</h2>
        <p className="text-sm text-muted">Par exemple 1 semaine à l&apos;école puis 3 semaines en entreprise, répété 8 fois. Les jours du lundi au vendredi sont remplis.</p>
        <RhythmForm today={today} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Appliquer à une période</h2>
        <RangeForm today={today} />
      </section>
    </div>
  );
}
