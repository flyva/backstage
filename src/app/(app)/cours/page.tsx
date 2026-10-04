import Link from "next/link";
import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import { AlertTriangle, FileText, Plus, RefreshCw } from "lucide-react";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { MANUAL_PREFIX, courseSyncStatus, syncCourses } from "@/lib/courses";
import { subjectKey } from "@/lib/subjects";
import { CourseList, type CourseItem } from "@/components/CourseList";
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
  const items: CourseItem[] = rows.map((c) => ({
    id: c.id,
    title: c.title,
    subjectKey: subjectKey(c.title),
    subjectName: c.title,
    day: dayKey(c.startsAt),
    dayLabel: dayFmt.format(c.startsAt),
    time: c.allDay ? "Journée" : `${timeFmt.format(c.startsAt)}–${timeFmt.format(c.endsAt)}`,
    location: c.location,
    excerpt: (c.note ?? "").replace(/[#*_>`\[\]()-]/g, "").replace(/\s+/g, " ").trim().slice(0, 200),
    hasNote: !!c.note?.trim(),
    removed: c.removed,
    external: c.uid.startsWith(MANUAL_PREFIX),
  }));

  return (
    <div className="max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mes cours</h1>
          <p className="text-sm text-muted">Copiés depuis ton planning de l&apos;école : ils restent ici même si le lien est en panne. Ouvre un cours pour écrire tes notes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cours/nouveau" className="btn text-sm"><Plus size={15} aria-hidden /> Ajouter un cours</Link>
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

      <CourseList items={items} emptyText={past ? "Aucun cours passé enregistré." : "Aucun cours à venir enregistré."} />
    </div>
  );
}
