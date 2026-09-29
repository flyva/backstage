import { asc, eq, inArray } from "drizzle-orm";
import { CalendarDays, MapPin, Trash2, Users } from "lucide-react";
import { db } from "@/db";
import { bdeEvents, bdeRegistrations, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canPublish } from "@/lib/news";
import { toParisInput } from "@/lib/paris";
import { deleteEvent, toggleRegistration } from "@/lib/bde-actions";
import { EventForm } from "@/components/bde-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "BDE · Évènements" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function BdeEventsPage() {
  const user = await requireUser();
  const manager = canPublish(user);
  const now = new Date();

  const events = await db.select().from(bdeEvents).orderBy(asc(bdeEvents.startsAt));
  const ids = events.map((e) => e.id);
  const regs = ids.length
    ? await db
        .select({ eventId: bdeRegistrations.eventId, userId: bdeRegistrations.userId, name: users.name })
        .from(bdeRegistrations)
        .innerJoin(users, eq(users.id, bdeRegistrations.userId))
        .where(inArray(bdeRegistrations.eventId, ids))
        .orderBy(asc(bdeRegistrations.createdAt))
    : [];
  const byEvent = Map.groupBy(regs, (r) => r.eventId);

  const upcoming = events.filter((e) => e.startsAt >= now);
  const past = events.filter((e) => e.startsAt < now).reverse().slice(0, 5);

  return (
    <div className="space-y-6">
      {upcoming.length === 0 && <p className="text-sm text-muted">Aucun évènement à venir.</p>}

      {upcoming.map((e) => {
        const list = byEvent.get(e.id) ?? [];
        const registered = list.some((r) => r.userId === user.id);
        const full = e.capacity !== null && list.length >= e.capacity;
        return (
          <article key={e.id} className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{e.title}</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="flex items-center gap-1.5 capitalize"><CalendarDays size={14} /> {dateFmt.format(e.startsAt)}</span>
                  {e.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {e.location}</span>}
                  <span className="flex items-center gap-1.5">
                    <Users size={14} /> {list.length}{e.capacity !== null && ` / ${e.capacity}`} inscrit{list.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <form action={toggleRegistration}>
                <input type="hidden" name="eventId" value={e.id} />
                {registered ? (
                  <button className="btn-ghost">Se désinscrire</button>
                ) : (
                  <button className="btn" disabled={full}>{full ? "Complet" : "Je m'inscris"}</button>
                )}
              </form>
            </div>
            {e.description && <p className="whitespace-pre-line text-sm">{e.description}</p>}
            {registered && <p className="text-xs text-accent">Tu es inscrit(e) ✓</p>}

            {manager && (
              <details className="border-t border-line pt-2">
                <summary className="cursor-pointer text-xs text-muted hover:text-fg">Gérer (équipe BDE) · {list.length} inscrit{list.length > 1 ? "s" : ""}</summary>
                <div className="space-y-4 pt-3">
                  {list.length > 0 && <p className="text-sm text-muted">{list.map((r) => r.name).join(", ")}</p>}
                  <EventForm
                    event={{
                      id: e.id, title: e.title, description: e.description ?? "", startsAt: toParisInput(e.startsAt),
                      location: e.location ?? "", capacity: e.capacity,
                    }}
                  />
                  <form action={deleteEvent}>
                    <input type="hidden" name="eventId" value={e.id} />
                    <ConfirmButton message="Supprimer cet évènement et ses inscriptions ?" className="flex items-center gap-1 text-xs text-danger">
                      <Trash2 size={12} /> Supprimer l&apos;évènement
                    </ConfirmButton>
                  </form>
                </div>
              </details>
            )}
          </article>
        );
      })}

      {manager && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Créer un évènement</h2>
          <EventForm />
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold text-muted">Évènements passés</h2>
          <ul className="text-sm text-muted">
            {past.map((e) => (
              <li key={e.id}>{e.title} · {(byEvent.get(e.id) ?? []).length} participant(s)</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

