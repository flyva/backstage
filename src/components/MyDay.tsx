import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { CalendarCheck, Clock, ListChecks, Route } from "lucide-react";
import { db } from "@/db";
import { workDays } from "@/db/schema";
import { KIND_CLASS, KIND_LABEL } from "@/lib/alternance";
import { cardHref, dueCards } from "@/lib/reminders";
import { tripEstimates, type LatLng } from "@/lib/mobility";
import { bestTransitCached } from "@/lib/transit";
import type { AgendaEvent } from "@/lib/ical";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]).catch(() => null);

type Props = {
  userId: number;
  today: string;
  events: AgendaEvent[] | null; // cours du jour (null : pas de calendrier)
  home: LatLng | null;
  school: LatLng | null;
};

// « Ma journée » : ce qui compte aujourd'hui, au même endroit — jour en entreprise ou à l'école, cours, heure de départ, tâches.
export async function MyDay({ userId, today, events, home, school }: Props) {
  const now = new Date();
  const timed = (events ?? []).filter((e) => !e.allDay).sort((a, b) => a.start.getTime() - b.start.getTime());
  const nextCourse = timed.find((e) => e.end >= now);

  const [dayRow, tasks, leave] = await Promise.all([
    db.select({ kind: workDays.kind }).from(workDays).where(and(eq(workDays.userId, userId), eq(workDays.day, today))).limit(1),
    dueCards(today, userId),
    (async () => {
      // Heure de départ conseillée pour arriver au prochain cours de la journée (transport en commun, sinon voiture), avec 5 min de marge.
      if (!nextCourse || nextCourse.start.getTime() < now.getTime() || !home || !school) return null;
      const [transit, trip] = await Promise.all([
        withTimeout(bestTransitCached(home, school), 3500),
        withTimeout(tripEstimates(home, school), 3500),
      ]);
      const min = transit?.totalMin ?? trip?.car?.minutes ?? null;
      if (min === null) return null;
      const by = transit ? "en transport" : "en voiture";
      return { at: new Date(nextCourse.start.getTime() - (min + 5) * 60000), min, by };
    })(),
  ]);
  const kind = dayRow[0]?.kind;

  return (
    <section className="card grid gap-5 lg:grid-cols-3" aria-label="Ma journée">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarCheck size={16} className="text-accent" /> Ma journée</h2>
        {kind ? (
          <p><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${KIND_CLASS[kind]}`}>{KIND_LABEL[kind]}</span></p>
        ) : (
          <p className="text-xs text-muted">Jour non planifié. <Link href="/alternance" className="text-accent underline">Planning de l&apos;alternance</Link></p>
        )}
        {events === null ? (
          <p className="text-sm text-muted">Ajoute ton lien iCal dans ton profil pour voir tes cours.</p>
        ) : timed.length === 0 ? (
          <p className="text-sm text-muted">Aucun cours aujourd&apos;hui.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {timed.slice(0, 5).map((e) => (
              <li key={`${e.start.getTime()}-${e.title}`} className={`flex gap-2 ${e.end < now ? "text-muted line-through" : ""}`}>
                <span className="w-24 shrink-0 tabular-nums text-muted">{timeFmt.format(e.start)}–{timeFmt.format(e.end)}</span>
                <span className="min-w-0 flex-1 truncate">{e.title}{e.location ? ` · ${e.location}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Route size={16} className="text-accent" /> Départ</h2>
        {leave ? (
          <>
            <p className="text-3xl font-bold tabular-nums">{timeFmt.format(leave.at)}</p>
            <p className="text-xs text-muted">
              Pour arriver avant {timeFmt.format(nextCourse!.start)} ({leave.min} min {leave.by}, +5 min de marge).
            </p>
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted"><Clock size={14} /> {nextCourse && nextCourse.start.getTime() < now.getTime() ? "Le cours a déjà commencé." : "Ajoute ton adresse et celle de l'école pour connaître l'heure de départ."}</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><ListChecks size={16} className="text-accent" /> Tâches à finir</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">Rien d&apos;urgent. <Link href="/kanban" className="text-accent underline">Mon kanban</Link></p>
        ) : (
          <ul className="space-y-1 text-sm">
            {tasks.slice(0, 5).map((t) => (
              <li key={`${t.projectId}-${t.cardId}`} className="flex items-baseline gap-2">
                <Link href={cardHref(t)} className="min-w-0 flex-1 truncate hover:text-accent">{t.title}</Link>
                <span className={`shrink-0 text-xs ${t.dueDate < today ? "font-medium text-danger" : "text-muted"}`}>{t.dueDate < today ? "en retard" : "aujourd'hui"}</span>
              </li>
            ))}
            {tasks.length > 5 && <li className="text-xs text-muted">+ {tasks.length - 5} autre(s)</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
