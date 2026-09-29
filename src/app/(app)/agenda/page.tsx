import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { refreshAgenda } from "@/lib/actions";
import { dayKey, getEvents, rangeOfWeek, weekDays, type AgendaEvent } from "@/lib/ical";

export const metadata = { title: "Agenda" };

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
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
      events = await getEvents(user.icalUrl, from, to);
    } catch (e) {
      error = e instanceof Error ? e.message : "erreur inconnue";
    }
  }
  const byDay = Map.groupBy(events, (e) => dayKey(e.start));
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

      {user.icalUrl && !error && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map(({ key, date }) => {
            const list = byDay.get(key) ?? [];
            const isToday = key === today;
            return (
              <section key={key} className={`card space-y-2 p-3 ${isToday ? "border-accent" : ""} ${list.length === 0 ? "opacity-70" : ""}`}>
                <h2 className={`text-sm font-semibold capitalize ${isToday ? "text-accent" : ""}`}>{dayFmt.format(date)}</h2>
                {list.length === 0 ? (
                  <p className="text-xs text-muted">Rien de prévu</p>
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
