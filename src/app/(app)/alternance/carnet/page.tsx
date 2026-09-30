import Link from "next/link";
import { and, desc, eq, like } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Download, Printer, Trash2 } from "lucide-react";
import { db } from "@/db";
import { workLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addMonths, dayLabel, fmtHours, isMonth, monthLabel } from "@/lib/alternance";
import { deleteLog } from "@/lib/alternance-actions";
import { LogForm } from "@/components/alternance-forms";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "Carnet de liaison" };

export default async function LogbookPage({ searchParams }: PageProps<"/alternance/carnet">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayParis();
  const month = isMonth(sp.m) ? sp.m : today.slice(0, 7);

  const logs = await db
    .select()
    .from(workLogs)
    .where(and(eq(workLogs.userId, user.id), like(workLogs.day, `${month}-%`)))
    .orderBy(desc(workLogs.day), desc(workLogs.id));
  const total = logs.reduce((s, l) => s + l.minutes, 0);
  const byPlace = (p: "entreprise" | "ecole") => logs.filter((l) => l.place === p).reduce((s, l) => s + l.minutes, 0);
  const skillCount = new Map<string, number>();
  for (const l of logs) for (const s of l.skills?.split(",") ?? []) skillCount.set(s, (skillCount.get(s) ?? 0) + 1);
  const skills = [...skillCount].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={`?m=${addMonths(month, -1)}`} className="btn-ghost px-2" aria-label="Mois précédent"><ChevronLeft size={16} /></Link>
            <h2 className="w-44 text-center text-lg font-semibold capitalize">{monthLabel(month)}</h2>
            <Link href={`?m=${addMonths(month, 1)}`} className="btn-ghost px-2" aria-label="Mois suivant"><ChevronRight size={16} /></Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/alternance/carnet/imprimer?m=${month}`} className="btn-ghost text-xs"><Printer size={14} /> Bilan du mois (PDF)</Link>
            <a href={`/alternance/carnet/export?m=${month}`} className="btn-ghost text-xs"><Download size={14} /> Ce mois (CSV)</a>
            <a href="/alternance/carnet/export" className="btn-ghost text-xs"><Download size={14} /> Tout (CSV)</a>
          </div>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">Total du mois</dt><dd className="text-2xl font-bold tabular-nums">{fmtHours(total)}</dd></div>
          <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">En entreprise</dt><dd className="text-2xl font-bold tabular-nums">{fmtHours(byPlace("entreprise"))}</dd></div>
          <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">À l&apos;école</dt><dd className="text-2xl font-bold tabular-nums">{fmtHours(byPlace("ecole"))}</dd></div>
        </dl>
        {skills.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted">Compétences du mois :</span>
            {skills.map(([s, n]) => <span key={s} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium">{s} <span className="text-muted">×{n}</span></span>)}
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une journée</h2>
        <LogForm day={today.startsWith(month) ? today : `${month}-01`} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Entrées ({logs.length})</h2>
        {logs.length === 0 && <p className="text-sm text-muted">Rien pour ce mois.</p>}
        {logs.map((l) => (
          <details key={l.id} className="card p-0">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 marker:hidden">
              <span className="font-medium capitalize">{dayLabel(l.day)}</span>
              <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{l.place === "ecole" ? "École" : "Entreprise"}</span>
              <span className="text-sm tabular-nums text-muted">{fmtHours(l.minutes)}</span>
            </summary>
            <div className="space-y-4 border-t border-line p-4">
              <div className="text-sm"><Markdown breaks>{l.mission}</Markdown></div>
              <LogForm id={l.id} day={l.day} hours={fmtHours(l.minutes).replace(" ", "")} place={l.place} mission={l.mission} skills={l.skills ?? ""} />
              <form action={deleteLog} className="border-t border-line pt-3">
                <input type="hidden" name="id" value={l.id} />
                <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer l&apos;entrée</button>
              </form>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
