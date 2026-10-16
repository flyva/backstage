import Link from "next/link";
import { and, asc, desc, eq, like } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { db } from "@/db";
import { timeEntries, workDays } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { KIND_LABEL, addMonths, dayLabel, fmtHours, fmtTime, isMonth, monthLabel } from "@/lib/alternance";
import { FIXED_KINDS, daySummary, entrySpanMinutes } from "@/lib/pointeuse";
import { deleteTimeEntry } from "@/lib/time-actions";
import { TimeEntryForm, DayStatusForm } from "@/components/time-forms";

export const metadata = { title: "Pointeuse" };

export default async function PointeusePage({ searchParams }: PageProps<"/alternance/pointeuse">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayParis();
  const month = isMonth(sp.m) ? sp.m : today.slice(0, 7);
  const currentMonth = today.slice(0, 7);

  const [entries, wdRows] = await Promise.all([
    db.select().from(timeEntries).where(and(eq(timeEntries.userId, user.id), like(timeEntries.day, `${month}-%`))).orderBy(desc(timeEntries.day), asc(timeEntries.startMinutes)),
    db.select().from(workDays).where(and(eq(workDays.userId, user.id), like(workDays.day, `${month}-%`))).orderBy(asc(workDays.day)),
  ]);
  const fixedDays = wdRows.filter((r) => (FIXED_KINDS as readonly string[]).includes(r.kind));
  const entriesByDay = new Map<string, typeof entries>();
  for (const e of entries) entriesByDay.set(e.day, [...(entriesByDay.get(e.day) ?? []), e]);

  const totalMonth = [...entriesByDay.entries()].reduce((s, [day, list]) => {
    const sum = daySummary(day, today, undefined, list, user.standardWorkMinutes);
    return s + sum.effectiveMinutes;
  }, 0) + fixedDays.length * 420;

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={`?m=${addMonths(month, -1)}`} className="btn-ghost px-2" aria-label="Mois précédent"><ChevronLeft size={16} /></Link>
            <h2 className="w-44 text-center text-lg font-semibold capitalize">{monthLabel(month)}</h2>
            {month < currentMonth ? <Link href={`?m=${addMonths(month, 1)}`} className="btn-ghost px-2" aria-label="Mois suivant"><ChevronRight size={16} /></Link> : <span className="w-8" />}
            {month !== currentMonth && <Link href="?" className="btn-ghost ml-2 text-xs">Aujourd&apos;hui</Link>}
          </div>
          <Link href="/alternance/stats" className="btn-ghost text-xs">Voir les statistiques →</Link>
        </div>
        <div className="rounded-xl border border-line bg-bg p-3 text-sm">
          <span className="text-muted">Effectif du mois (approximatif, voir les stats pour le détail) : </span>
          <strong className="tabular-nums">{fmtHours(totalMonth)}</strong>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une ligne d&apos;heure</h2>
        <p className="text-sm text-muted">Un jour école, congé ou maladie est déjà compté automatiquement (7 h) : inutile d&apos;ajouter une ligne dessus.</p>
        <TimeEntryForm today={today} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Marquer congé ou maladie</h2>
        <DayStatusForm today={today} />
        {fixedDays.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {fixedDays.map((d) => (
              <li key={d.day} className="rounded-full border border-line px-2.5 py-1">{dayLabel(d.day)} · {KIND_LABEL[d.kind]}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Lignes saisies ({entries.length})</h2>
        {entries.length === 0 && <p className="text-sm text-muted">Aucune ligne ce mois-ci.</p>}
        <ul className="space-y-2">
          {entries.map((e) => {
            const crosses = e.endDay > e.day;
            const gross = entrySpanMinutes(e, e.day);
            const effective = Math.max(0, gross - e.pauseMinutes);
            return (
              <li key={e.id} className="card p-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
                  <span className="min-w-0 flex-1 font-medium capitalize">{dayLabel(e.day)}</span>
                  <span className="tabular-nums text-muted">{fmtTime(e.startMinutes)} – {fmtTime(e.endMinutes)}{crosses && <span className="ml-1 rounded-full border border-line px-1.5 py-0.5 text-[10px] font-medium">+1 j</span>}</span>
                  <span className="tabular-nums text-muted">Pause {fmtHours(e.pauseMinutes)}</span>
                  <span className="tabular-nums font-medium">{fmtHours(effective)} effectif</span>
                  {e.comment && <span className="text-xs text-muted">« {e.comment} »</span>}
                </div>
                <details className="border-t border-line">
                  <summary className="cursor-pointer list-none px-3 py-1.5 text-xs text-muted hover:text-fg marker:hidden">Modifier</summary>
                  <div className="space-y-3 p-3 pt-1">
                    <TimeEntryForm today={today} id={e.id} day={e.day} endDay={e.endDay} start={fmtTime(e.startMinutes)} end={fmtTime(e.endMinutes)} pause={e.pauseMinutes} comment={e.comment ?? ""} />
                    <form action={deleteTimeEntry} className="border-t border-line pt-3">
                      <input type="hidden" name="id" value={e.id} />
                      <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
