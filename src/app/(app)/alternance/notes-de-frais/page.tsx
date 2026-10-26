import Link from "next/link";
import { and, eq, gte, lte } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Download, Plus, Receipt, Trash2 } from "lucide-react";
import { db } from "@/db";
import { expenseNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addWeeks, dayLabel, isWeek, restoMealRefund, weekDays, weekLabel, weekStart } from "@/lib/alternance";
import { deleteExpenseNote } from "@/lib/expense-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/people-forms";

export const metadata = { title: "Notes de frais" };

const fmtEuros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const MOMENT_LABEL = { midi: "Midi", soir: "Soir" } as const;

export default async function ExpenseNotesPage({ searchParams }: PageProps<"/alternance/notes-de-frais">) {
  const user = await requireUser();
  const sp = await searchParams;
  const week = isWeek(sp.w) ? weekStart(sp.w) : weekStart(todayParis());
  const days = weekDays(week);

  const notes = await db
    .select()
    .from(expenseNotes)
    .where(and(eq(expenseNotes.userId, user.id), gte(expenseNotes.date, days[0]), lte(expenseNotes.date, days[6])))
    .orderBy(expenseNotes.date, expenseNotes.time);
  const total = notes.reduce((s, n) => s + n.priceCents, 0);

  const resto = { maxDayCents: user.restoMaxDayCents, maxMealCents: user.restoMaxMealCents, trCents: user.restoTrCents, trMoment: user.restoTrMoment };
  const restoConfigured = resto.maxMealCents !== null;
  const refundOf = (n: (typeof notes)[number]) => restoMealRefund(n.priceCents, n.moment, resto);

  const byDay = new Map<string, Map<string, typeof notes>>();
  for (const day of days) byDay.set(day, new Map([["midi", []], ["soir", []]]));
  for (const n of notes) byDay.get(n.date)?.get(n.moment)?.push(n);

  const dayStats = new Map<string, { price: number; refundRaw: number; refund: number; overCap: boolean }>();
  for (const day of days) {
    const dayNotes = notes.filter((n) => n.date === day);
    const price = dayNotes.reduce((s, n) => s + n.priceCents, 0);
    const refundRaw = dayNotes.reduce((s, n) => s + (refundOf(n) ?? 0), 0);
    const refund = resto.maxDayCents === null ? refundRaw : Math.min(refundRaw, resto.maxDayCents);
    dayStats.set(day, { price, refundRaw, refund, overCap: resto.maxDayCents !== null && refundRaw > resto.maxDayCents });
  }
  const weekRefund = [...dayStats.values()].reduce((s, d) => s + d.refund, 0);
  const weekCharge = total - weekRefund;

  return (
    <div className="max-w-2xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Receipt size={22} className="text-accent" /> Notes de frais</h1>
          <p className="text-sm text-muted">{notes.length} note(s) cette semaine · {fmtEuros(total)} au total</p>
        </div>
        <Link href="/alternance/notes-de-frais/nouveau" className="btn"><Plus size={15} /> Nouvelle note</Link>
      </header>

      <div className="flex items-center justify-center gap-1">
        <Link href={`?w=${addWeeks(week, -1)}`} className="btn-ghost px-2" aria-label="Semaine précédente"><ChevronLeft size={16} /></Link>
        <h2 className="w-48 text-center text-sm font-semibold capitalize text-muted">Semaine du {weekLabel(week)}</h2>
        <Link href={`?w=${addWeeks(week, 1)}`} className="btn-ghost px-2" aria-label="Semaine suivante"><ChevronRight size={16} /></Link>
      </div>

      {restoConfigured && total > 0 && (
        <div className="card grid grid-cols-2 gap-3 text-center sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Remboursé cette semaine</p>
            <p className="text-xl font-bold tabular-nums">{fmtEuros(weekRefund)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Non remboursé</p>
            <p className={`text-xl font-bold tabular-nums ${weekCharge > 0 ? "text-danger" : ""}`}>{fmtEuros(weekCharge)}</p>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {days.map((day) => {
          const moments = byDay.get(day)!;
          const stats = dayStats.get(day)!;
          return (
            <li key={day} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium capitalize">{dayLabel(day)}</p>
                {restoConfigured && stats.price > 0 && (
                  <p className="text-xs text-muted">
                    Remboursé {fmtEuros(stats.refund)}
                    {stats.price > stats.refund && <span className="text-danger"> · à ta charge {fmtEuros(stats.price - stats.refund)}</span>}
                    {stats.overCap && <span className="text-danger"> · plafond journalier dépassé</span>}
                  </p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["midi", "soir"] as const).map((moment) => {
                  const entries = moments.get(moment) ?? [];
                  return (
                    <div key={moment} className="space-y-1.5 rounded-xl border border-line p-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{MOMENT_LABEL[moment]}</p>
                      {entries.length === 0 && (
                        <Link
                          href={`/alternance/notes-de-frais/nouveau?day=${day}&moment=${moment}`}
                          className="flex items-center gap-1 rounded-lg border border-dashed border-line px-2 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
                        >
                          <Plus size={13} /> Ajouter
                        </Link>
                      )}
                      {entries.map((n) => {
                        const refund = refundOf(n);
                        return (
                        <div key={n.id} className="flex items-center gap-2 rounded-lg bg-bg p-1.5">
                          <Link href={`/alternance/notes-de-frais/${n.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/alternance/notes-de-frais/${n.id}/photo`} alt="" className="size-9 shrink-0 rounded-md border border-line object-cover" loading="lazy" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium">{n.placeName || n.place}</span>
                              <span className="block text-xs font-semibold tabular-nums text-muted">{fmtEuros(n.priceCents)}</span>
                              {refund !== null && (
                                <span className={`block text-xs tabular-nums ${refund < n.priceCents ? "text-danger" : "text-muted"}`}>
                                  Remboursé {fmtEuros(refund)}{refund < n.priceCents && ` · charge ${fmtEuros(n.priceCents - refund)}`}
                                </span>
                              )}
                            </span>
                          </Link>
                          <CopyButton value={n.comment} label="" />
                          <a href={`/api/alternance/notes-de-frais/${n.id}/photo?dl=1`} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg" aria-label="Télécharger la photo"><Download size={13} /></a>
                          <form action={deleteExpenseNote}>
                            <input type="hidden" name="id" value={n.id} />
                            <ConfirmButton message="Supprimer définitivement cette note de frais ?" className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-danger">
                              <Trash2 size={13} aria-label="Supprimer" />
                            </ConfirmButton>
                          </form>
                        </div>
                        );
                      })}
                      {entries.length > 0 && (
                        <Link
                          href={`/alternance/notes-de-frais/nouveau?day=${day}&moment=${moment}`}
                          className="flex items-center gap-1 text-xs text-muted hover:text-accent"
                        >
                          <Plus size={12} /> Ajouter une autre
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
