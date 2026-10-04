import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CalendarDays, Clock, Trash2, FileText, MapPin, NotebookPen, Pencil, Printer } from "lucide-react";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { deleteManualCourse } from "@/lib/course-actions";
import { MANUAL_PREFIX } from "@/lib/courses";
import { ConfirmButton } from "@/components/ConfirmButton";
import { requireUser } from "@/lib/auth";
import { loadSubjects, subjectKey } from "@/lib/subjects";
import { CourseNoteEditor } from "@/components/CourseNoteEditor";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "Cours" };

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

export default async function CoursePage({ params, searchParams }: PageProps<"/cours/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [course] = await db.select().from(courses).where(and(eq(courses.id, id), eq(courses.userId, user.id))).limit(1);
  if (!course) notFound();

  const key = subjectKey(course.title);
  const subject = (await loadSubjects(user.id)).find((s) => s.key === key);
  const siblings = (subject?.courses ?? []).filter((c) => !c.removed || c.note?.trim());
  const hasNote = !!course.note?.trim();
  const editing = (await searchParams).modifier === "1" || (!hasNote && (await searchParams).modifier !== "0");
  const here = `/cours/${course.id}`;
  const manual = course.uid.startsWith(MANUAL_PREFIX);

  return (
    <div className="max-w-6xl space-y-5">
      <p className="text-sm"><Link href="/cours" className="text-muted underline">← Mes cours</Link></p>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_16rem]">
        <article className="min-w-0 space-y-5">
          <header className="space-y-2 border-b border-line pb-4">
            <h1 className="text-2xl font-bold leading-snug">{course.title}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5 capitalize"><CalendarDays size={15} aria-hidden /> {dayFmt.format(course.startsAt)}</span>
              {!course.allDay && <span className="flex items-center gap-1.5"><Clock size={15} aria-hidden /> {timeFmt.format(course.startsAt)}–{timeFmt.format(course.endsAt)}</span>}
              {course.location && <span className="flex items-center gap-1.5"><MapPin size={15} aria-hidden /> {course.location}</span>}
            </p>
            {manual && <p className="inline-block rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">Ajouté par toi (hors planning de l&apos;école)</p>}
            {course.removed && <p className="inline-block rounded-full border border-danger/50 px-2.5 py-0.5 text-xs text-danger">Ce cours a été retiré du planning de l&apos;école</p>}
            {course.description && <p className="whitespace-pre-line text-sm text-muted">{course.description}</p>}
          </header>

          <section className="space-y-3" aria-label="Mes notes">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><NotebookPen size={18} className="text-accent" aria-hidden /> Mes notes</h2>
              {!editing && <Link href={`${here}?modifier=1`} className="btn-ghost text-sm"><Pencil size={14} aria-hidden /> Modifier</Link>}
            </div>
            {editing ? (
              <CourseNoteEditor id={course.id} note={course.note ?? ""} cancelHref={`${here}?modifier=0`} />
            ) : (
              <div className="card"><Markdown breaks>{course.note ?? ""}</Markdown></div>
            )}
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Cette matière</h2>
            <p className="text-xs text-muted">{siblings.length} cours · {siblings.filter((c) => c.note?.trim()).length} avec notes</p>
            <ul className="max-h-80 space-y-0.5 overflow-y-auto slim-scroll text-sm">
              {siblings.map((c) => (
                <li key={c.id}>
                  <Link href={`/cours/${c.id}`} aria-current={c.id === course.id ? "page" : undefined}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${c.id === course.id ? "bg-accent/15 font-semibold" : "hover:bg-bg"}`}>
                    <span className="min-w-0">
                      <span className="capitalize">{shortFmt.format(c.startsAt)}</span>
                      <span className="block text-xs font-normal tabular-nums text-muted">{c.allDay ? "Journée" : `${timeFmt.format(c.startsAt)}–${timeFmt.format(c.endsAt)}`}</span>
                    </span>
                    {c.note?.trim() && <NotebookPen size={13} className="shrink-0 text-accent" aria-label="Avec notes" />}
                  </Link>
                </li>
              ))}
            </ul>
            {manual && (
              <form action={deleteManualCourse} className="border-t border-line pt-3">
                <input type="hidden" name="id" value={course.id} />
                <ConfirmButton className="btn-ghost w-full text-xs text-danger" message="Supprimer ce cours et ses notes ?"><Trash2 size={14} aria-hidden /> Supprimer ce cours</ConfirmButton>
              </form>
            )}
            {subject && subject.noted.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <Link href={`/cours/fiches/imprimer?matiere=${encodeURIComponent(subject.key)}`} className="btn-ghost text-xs"><Printer size={14} aria-hidden /> Fiche PDF de la matière</Link>
                <Link href="/cours/fiches" className="btn-ghost text-xs"><FileText size={14} aria-hidden /> Fiches par matière</Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
