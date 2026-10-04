import Link from "next/link";
import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import { AlertTriangle, FileText, MapPin, NotebookPen, RefreshCw } from "lucide-react";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { courseSyncStatus, syncCourses } from "@/lib/courses";
import { syncCoursesNow } from "@/lib/course-actions";
import { dayKey } from "@/lib/ical";

export const metadata = { title: "Mes cours" };

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const syncFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function CoursPage({ searchParams }: PageProps<"/cours">) {
  const user = await requireUser();
  const past = (await searchParams).passes === "1";
  const now = new Date();

  let status = await courseSyncStatus(user.id);
  // Première visite : on récupère le planning pour que la page ne soit pas vide.
  if (user.icalUrl && !status.syncedAt && !status.error) {
    await syncCourses(user.id, user.icalUrl);
    status = await courseSyncStatus(user.id);
  }

  const rows = past
    ? await db.select().from(courses).where(and(eq(courses.userId, user.id), lte(courses.endsAt, now))).orderBy(desc(courses.startsAt)).limit(150)
    : await db.select().from(courses).where(and(eq(courses.userId, user.id), gt(courses.endsAt, now))).orderBy(asc(courses.startsAt)).limit(300);
  const byDay = [...Map.groupBy(rows, (c) => dayKey(c.startsAt))];

  return (
    <div className="max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes cours</h1>
          <p className="text-sm text-muted">Copiés depuis ton planning de l&apos;école : ils restent ici même si le lien est en panne. Ouvre un cours pour écrire tes notes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cours/fiches" className="btn-ghost text-sm"><FileText size={15} aria-hidden /> Fiches par matière</Link>
          {user.icalUrl && (
            <form action={syncCoursesNow}>
              <button className="btn-ghost text-sm"><RefreshCw size={15} aria-hidden /> Synchroniser</button>
            </form>
          )}
        </div>
      </header>

      {!user.icalUrl ? (
        <div className="card border-accent text-sm">Ajoute ton lien iCalendar de l&apos;école dans ton <Link href="/profil" className="font-medium text-accent underline">profil</Link> pour retrouver tes cours ici.</div>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {status.error && <span className="flex items-center gap-1 rounded-full border border-danger/50 px-2 py-0.5 text-danger"><AlertTriangle size={12} aria-hidden /> Planning de l&apos;école injoignable ({status.error}) : derniers cours enregistrés affichés.</span>}
          {status.syncedAt ? <span>Dernière synchronisation : {syncFmt.format(status.syncedAt)}</span> : <span>Pas encore synchronisé.</span>}
        </p>
      )}

      <nav className="flex gap-2 text-sm" aria-label="Période">
        <Link href="/cours" className={`rounded-full border px-3 py-1 ${!past ? "border-accent bg-accent text-accent-fg" : "border-line text-muted"}`}>À venir</Link>
        <Link href="/cours?passes=1" className={`rounded-full border px-3 py-1 ${past ? "border-accent bg-accent text-accent-fg" : "border-line text-muted"}`}>Passés</Link>
      </nav>

      {user.icalUrl && rows.length === 0 && <p className="text-sm text-muted">{past ? "Aucun cours passé enregistré." : "Aucun cours à venir enregistré."}</p>}

      {byDay.map(([key, list]) => (
        <section key={key} className="space-y-2">
          <h2 className="text-sm font-semibold capitalize text-muted">{dayFmt.format(list[0].startsAt)}</h2>
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`/cours/${c.id}`} className="card flex items-start gap-3 p-4 hover:border-accent">
                  <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">{c.allDay ? "Journée" : `${timeFmt.format(c.startsAt)}–${timeFmt.format(c.endsAt)}`}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{c.title}</span>
                    {c.location && <span className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} aria-hidden /> {c.location}</span>}
                    {c.note?.trim() && <span className="mt-1 line-clamp-2 block text-xs text-muted">{c.note.replace(/[#*_>`[]()-]/g, "").trim()}</span>}
                    {c.removed && <span className="mt-1 inline-block rounded-full border border-danger/50 px-2 py-0.5 text-[11px] text-danger">Retiré du planning de l&apos;école</span>}
                  </span>
                  <NotebookPen size={16} className={`mt-0.5 shrink-0 ${c.note?.trim() ? "text-accent" : "text-line"}`} aria-label={c.note?.trim() ? "Ce cours a des notes" : "Ajouter des notes"} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
