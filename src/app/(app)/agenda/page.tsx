import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import { db } from "@/db";
import { users, workDays } from "@/db/schema";
import { KIND_CLASS, KIND_LABEL } from "@/lib/alternance";
import { requireUser } from "@/lib/auth";
import { refreshAgenda } from "@/lib/actions";
import { WeekGrid } from "@/components/WeekGrid";
import { courseEvents } from "@/lib/courses";
import { resolveTimeSubject, tutees } from "@/lib/time-access";
import { dayKey, eventGroupTag, rangeOfWeek, weekDays, type AgendaEvent } from "@/lib/ical";

export const metadata = { title: "Agenda" };

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const nowFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const rangeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });

function EventCard({ e }: { e: AgendaEvent }) {
  const { base, tag } = eventGroupTag(e);
  return (
    <li className="relative rounded-lg border border-line border-l-4 border-l-accent bg-bg p-2.5 text-sm hover:border-accent">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium tabular-nums text-accent">
          {e.allDay ? "Toute la journée" : `${timeFmt.format(e.start)} – ${timeFmt.format(e.end)}`}
        </div>
        {tag && <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-accent">{tag}</span>}
      </div>
      <div className="font-medium leading-snug">{/^cd+$/.test(e.id) ? <Link href={`/cours/${e.id.slice(1)}`} className="after:absolute after:inset-0">{base}</Link> : base}</div>
      {e.location && (
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} /> {e.location}</div>
      )}
      {/* Pas affiché si c'est juste le code dont le groupe est déjà extrait (ex. « RT1_GROUPE B ») ou un texte générique Ypareo. */}
      {e.description && !/^[A-Z0-9]+_\s*GROUPE\s+/i.test(e.description.trim()) && e.description.trim() !== "Planning NetYParéo" && (
        <div className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted">{e.description}</div>
      )}
    </li>
  );
}

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const user = await requireUser();
  const sp = await searchParams;
  const raw = Number(sp.s ?? 0);
  const offset = Number.isInteger(raw) ? Math.max(-26, Math.min(52, raw)) : 0;
  const days = weekDays(offset);
  const today = dayKey(new Date());

  const mine = await tutees(user.id);
  // Pas de bascule automatique, même pour un compte Entreprise : seul un ?as= explicite (choisi depuis l'accueil ou
  // le sélecteur ci-dessous) affiche l'agenda de quelqu'un d'autre.
  const asParam = typeof sp.as === "string" ? sp.as : undefined;
  const subject = await resolveTimeSubject(user, asParam);
  const subjectIcal = subject.userId === user.id ? user.icalUrl : ((await db.select({ icalUrl: users.icalUrl }).from(users).where(eq(users.id, subject.userId)).limit(1))[0]?.icalUrl ?? null);

  let events: AgendaEvent[] = [];
  let error: string | null = null;
  try {
    const { from, to } = rangeOfWeek(days);
    events = await courseEvents({ id: subject.userId, icalUrl: subjectIcal }, from, to);
  } catch (e) {
    error = e instanceof Error ? e.message : "erreur inconnue";
  }
  const byDay = Map.groupBy(events, (e) => dayKey(e.start));
  // Planning de l'alternance (école / entreprise / congé / férié) : affiché même sans lien iCal.
  const kinds = new Map((await db.select({ day: workDays.day, kind: workDays.kind }).from(workDays).where(and(eq(workDays.userId, subject.userId), inArray(workDays.day, days.map((d) => d.key))))).map((r) => [r.day, r.kind]));
  const np = nowFmt.formatToParts(new Date());
  const nowMinutes = Number(np.find((p) => p.type === "hour")?.value) * 60 + Number(np.find((p) => p.type === "minute")?.value);
  const label = `${rangeFmt.format(days[0].date)} – ${rangeFmt.format(days[6].date)}`;
  const weekHref = (s: number) => `?${new URLSearchParams({ s: String(s), ...(subject.readonly ? { as: String(subject.userId) } : {}) })}`;

  return (
    <div className="space-y-6">
      {(mine.length > 0 || subject.readonly) && (
        <section className="card flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{subject.readonly ? `Tu regardes l'agenda de ${subject.name} (lecture seule).` : "Tu vois aussi, en tant que référent :"}</span>
          {subject.readonly && (
            <Link href={user.perms.companyOnly ? "/" : "/agenda"} className="btn-ghost text-xs">← {user.perms.companyOnly ? "Revenir à l'accueil" : "Revenir à mon agenda"}</Link>
          )}
          {mine.filter((t) => t.id !== subject.userId).map((t) => (
            <Link key={t.id} href={`/agenda?as=${t.id}`} className="rounded-full border border-line px-2.5 py-1 text-xs hover:border-accent">{t.name}</Link>
          ))}
        </section>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted">{subject.readonly ? "Planning Ypareo" : "Ton planning Ypareo"}, semaine du {label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={weekHref(offset - 1)} className="btn-ghost" aria-label="Semaine précédente"><ChevronLeft size={16} /></Link>
          <Link href={subject.readonly ? `?as=${subject.userId}` : "/agenda"} className="btn-ghost">Aujourd&apos;hui</Link>
          <Link href={weekHref(offset + 1)} className="btn-ghost" aria-label="Semaine suivante"><ChevronRight size={16} /></Link>
          {!subject.readonly && user.icalUrl && (
            <form action={refreshAgenda}>
              <button className="btn-ghost" title="Resynchroniser avec Ypareo"><RefreshCw size={16} /></button>
            </form>
          )}
        </div>
      </header>

      {!subjectIcal && (
        <div className="card border-accent text-sm">
          {subject.readonly ? (
            "Aucun planning relié chez cette personne."
          ) : (
            <>Aucun planning relié. Ajoute ton lien iCalendar dans ton{" "}
            <Link href="/profil" className="font-medium text-accent underline">profil</Link> (Planning → Action → Export au format iCalendar).</>
          )}
        </div>
      )}
      {error && (
        <div className="card border-danger text-sm">
          {subject.readonly ? (
            `Impossible de lire ce planning : ${error}.`
          ) : (
            <>Impossible de lire ton planning : {error}. Vérifie ton lien dans ton{" "}
            <Link href="/profil" className="text-accent underline">profil</Link>.</>
          )}
        </div>
      )}

      {!error && <div className="hidden md:block"><WeekGrid days={days} byDay={byDay} kinds={kinds} today={today} nowMinutes={nowMinutes} /></div>}

      {!error && (
        <div className="grid gap-3 md:hidden">
          {days.map(({ key, date }) => {
            const list = byDay.get(key) ?? [];
            const isToday = key === today;
            const kind = kinds.get(key);
            return (
              <section key={key} className={`card space-y-2 p-3 ${isToday ? "border-accent" : ""} ${list.length === 0 && !kind ? "opacity-70" : ""}`}>
                <h2 className={`flex flex-wrap items-center justify-between gap-1 text-sm font-semibold capitalize ${isToday ? "text-accent" : ""}`}>
                  {dayFmt.format(date)}
                  {kind && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold normal-case ${KIND_CLASS[kind]}`}>{KIND_LABEL[kind]}</span>}
                </h2>
                {list.length === 0 ? (
                  <p className="text-xs text-muted">{kind === "entreprise" ? "Journée en entreprise" : kind === "ferie" ? "Jour férié" : kind === "conge" ? "Congé" : "Rien de prévu"}</p>
                ) : (
                  <ul className="space-y-2">{list.map((e) => <EventCard key={e.id} e={e} />)}</ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
