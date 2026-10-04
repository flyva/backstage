import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import { db } from "@/db";
import { workDays } from "@/db/schema";
import { KIND_CLASS, KIND_LABEL } from "@/lib/alternance";
import { requireUser } from "@/lib/auth";
import { refreshAgenda } from "@/lib/actions";
import { WeekGrid } from "@/components/WeekGrid";
import { courseEvents } from "@/lib/courses";
import { dayKey, rangeOfWeek, weekDays, type AgendaEvent } from "@/lib/ical";

export const metadata = { title: "Agenda" };

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const nowFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const rangeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" });

function EventCard({ e }: { e: AgendaEvent }) {
  return (
    <li className="rounded-lg border border-line border-l-4 border-l-accent bg-bg p-2.5 text-sm">
      <div className="text-xs font-medium tabular-nums text-accent">
        {e.allDay ? "Toute la journée" : `${timeFmt.format(e.start)} – ${timeFmt.format(e.end)}`}
      </div>
      <div className="font-medium leading-snug">{e.title}</div>
      {e.location && (
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} /> {e.location}</div>
      )}
      {e.description && <div className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted">{e.description}</div>}
    </li>
  );
}

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const user = await requireUser();
  const raw = Number((await searchParams).s ?? 0);
  const offset = Number.isInteger(raw) ? Math.max(-26, Math.min(52, raw)) : 0;
  const days = weekDays(offset);
  const today = dayKey(new Date());

  let events: AgendaEvent[] = [];
  let error: string | null = null;
  if (user.icalUrl) {
    try {
      const { from, to } = rangeOfWeek(days);
      events = await courseEvents(user, from, to);
    } catch (e) {
      error = e instanceof Error ? e.message : "erreur inconnue";
    }
  }
  const byDay = Map.groupBy(events, (e) => dayKey(e.start));
  // Planning de l'alternance (école / entreprise / congé / férié) : affiché même sans lien iCal.
  const kinds = new Map((await db.select({ day: workDays.day, kind: workDays.kind }).from(workDays).where(and(eq(workDays.userId, user.id), inArray(workDays.day, days.map((d) => d.key))))).map((r) => [r.day, r.kind]));
  const np = nowFmt.formatToParts(new Date());
  const nowMinutes = Number(np.find((p) => p.type === "hour")?.value) * 60 + Number(np.find((p) => p.type === "minute")?.value);
  const label = `${rangeFmt.format(days[0].date)} – ${rangeFmt.format(days[6].date)}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted">Ton planning Ypareo, semaine du {label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/agenda?s=${offset - 1}`} className="btn-ghost" aria-label="Semaine précédente"><ChevronLeft size={16} /></Link>
          <Link href="/agenda" className="btn-ghost">Aujourd&apos;hui</Link>
          <Link href={`/agenda?s=${offset + 1}`} className="btn-ghost" aria-label="Semaine suivante"><ChevronRight size={16} /></Link>
          {user.icalUrl && (
            <form action={refreshAgenda}>
              <button className="btn-ghost" title="Resynchroniser avec Ypareo"><RefreshCw size={16} /></button>
            </form>
          )}
        </div>
      </header>

      {!user.icalUrl && (
        <div className="card border-accent text-sm">
          Aucun planning relié. Ajoute ton lien iCalendar dans ton{" "}
          <Link href="/profil" className="font-medium text-accent underline">profil</Link> (Planning → Action → Export au format iCalendar).
        </div>
      )}
      {error && (
        <div className="card border-danger text-sm">
          Impossible de lire ton planning : {error}. Vérifie ton lien dans ton{" "}
          <Link href="/profil" className="text-accent underline">profil</Link>.
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
