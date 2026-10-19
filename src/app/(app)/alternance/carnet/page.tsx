import Link from "next/link";
import { and, asc, desc, eq, inArray, like } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Download, Printer, Trash2 } from "lucide-react";
import { db } from "@/db";
import { workLogFiles, workLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { addMonths, dayLabel, isMonth, monthLabel } from "@/lib/alternance";
import { deleteLog } from "@/lib/alternance-actions";
import { LogForm } from "@/components/alternance-forms";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "Journal de bord" };

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
  const files = logs.length
    ? await db.select().from(workLogFiles).where(inArray(workLogFiles.workLogId, logs.map((l) => l.id))).orderBy(asc(workLogFiles.id))
    : [];
  const filesByLog = new Map<number, { id: number; url: string }[]>();
  for (const f of files) filesByLog.set(f.workLogId, [...(filesByLog.get(f.workLogId) ?? []), { id: f.id, url: `/api/alternance/carnet/${f.workLogId}/photo/${f.id}` }]);
  const byPlace = (p: "entreprise" | "ecole") => logs.filter((l) => l.place === p).length;
  const skillCount = new Map<string, number>();
  for (const l of logs) for (const s of l.skills?.split(",") ?? []) skillCount.set(s, (skillCount.get(s) ?? 0) + 1);
  const skills = [...skillCount].sort((a, b) => b[1] - a[1]);
  const period = (l: { day: string; endDay: string }) => (l.day === l.endDay ? dayLabel(l.day) : `${dayLabel(l.day)} → ${dayLabel(l.endDay)}`);

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
            <Link href={`/alternance/dossier?m=${month}`} className="btn-ghost text-xs"><Printer size={14} /> Dossier complet (carnet + pointeuse)</Link>
            <a href={`/alternance/carnet/export?m=${month}`} className="btn-ghost text-xs"><Download size={14} /> Ce mois (CSV)</a>
            <a href="/alternance/carnet/export" className="btn-ghost text-xs"><Download size={14} /> Tout (CSV)</a>
          </div>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">Entrées du mois</dt><dd className="text-2xl font-bold tabular-nums">{logs.length}</dd></div>
          <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">En entreprise</dt><dd className="text-2xl font-bold tabular-nums">{byPlace("entreprise")}</dd></div>
          <div className="rounded-xl border border-line bg-bg p-3"><dt className="text-muted">À l&apos;école</dt><dd className="text-2xl font-bold tabular-nums">{byPlace("ecole")}</dd></div>
        </dl>
        {skills.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted">Compétences du mois :</span>
            {skills.map(([s, n]) => <span key={s} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium">{s} <span className="text-muted">×{n}</span></span>)}
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une entrée</h2>
        <LogForm today={today} day={today.startsWith(month) ? today : `${month}-01`} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Entrées ({logs.length})</h2>
        {logs.length === 0 && <p className="text-sm text-muted">Rien pour ce mois.</p>}
        {logs.map((l) => {
          const photos = filesByLog.get(l.id) ?? [];
          return (
            <details key={l.id} className="card p-0">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 marker:hidden">
                <span className="font-medium">{l.title || <span className="capitalize">{period(l)}</span>}</span>
                {l.title && <span className="text-xs text-muted">{period(l)}</span>}
                <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{l.place === "ecole" ? "École" : "Entreprise"}</span>
                {photos.length > 0 && <span className="text-xs text-muted">{photos.length} photo{photos.length > 1 ? "s" : ""}</span>}
              </summary>
              <div className="space-y-4 border-t border-line p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-0 flex-1 text-sm"><Markdown breaks>{l.mission}</Markdown></div>
                  {photos.length > 0 && (
                    <ul className="flex shrink-0 flex-wrap gap-2 sm:max-w-[9.5rem]">
                      {photos.map((p) => (
                        <li key={p.id}>
                          <a href={`${p.url}?dl=1`} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="" className="size-20 rounded-lg border border-line object-cover" loading="lazy" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <LogForm today={today} id={l.id} day={l.day} endDay={l.endDay} place={l.place} title={l.title ?? ""} mission={l.mission} skills={l.skills ?? ""} existingPhotos={photos} />
                <form action={deleteLog} className="border-t border-line pt-3">
                  <input type="hidden" name="id" value={l.id} />
                  <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer l&apos;entrée</button>
                </form>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
