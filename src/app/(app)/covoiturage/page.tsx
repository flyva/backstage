import { asc, eq, gte, inArray } from "drizzle-orm";
import { Car, MapPin, Trash2, Users } from "lucide-react";
import { db } from "@/db";
import { ridePassengers, rides, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { toParisInput } from "@/lib/paris";
import { deleteRide, joinRide, leaveRide } from "@/lib/ride-actions";
import { RideForm } from "@/components/RideForm";

export const metadata = { title: "Covoiturage" };

const whenFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function CarpoolPage({ searchParams }: PageProps<"/covoiturage">) {
  const user = await requireUser();
  const sp = await searchParams;
  const preset = typeof sp.titre === "string" ? sp.titre.slice(0, 150) : "";

  const list = await db
    .select({ r: rides, driver: users.name })
    .from(rides)
    .innerJoin(users, eq(users.id, rides.driverId))
    .where(gte(rides.departsAt, new Date(new Date().getTime() - 3600_000)))
    .orderBy(asc(rides.departsAt));
  const pax = list.length
    ? await db.select({ rideId: ridePassengers.rideId, userId: users.id, name: users.name }).from(ridePassengers).innerJoin(users, eq(users.id, ridePassengers.userId)).where(inArray(ridePassengers.rideId, list.map((l) => l.r.id))).orderBy(asc(users.name))
    : [];
  const paxBy = Map.groupBy(pax, (p) => p.rideId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Covoiturage</h1>
        <p className="text-sm text-muted">Propose une place dans ta voiture pour une soirée, un montage ou une sortie, ou réserve celle d&apos;un autre. Les inscrits se voient entre eux : mettez-vous d&apos;accord sur le point de rendez-vous.</p>
      </header>

      <details className="card p-0" open={!!preset}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold marker:hidden"><Car size={16} className="text-accent" /> Proposer un trajet</summary>
        <div className="border-t border-line p-4"><RideForm title={preset} /></div>
      </details>

      <section className="space-y-3">
        <h2 className="font-semibold">Trajets à venir ({list.length})</h2>
        {list.length === 0 && <p className="text-sm text-muted">Aucun trajet proposé pour le moment.</p>}
        {list.map(({ r, driver }) => {
          const people = paxBy.get(r.id) ?? [];
          const mine = r.driverId === user.id;
          const joined = people.some((p) => p.userId === user.id);
          const left = r.seats - people.length;
          return (
            <article key={r.id} className="card space-y-3">
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="min-w-0 flex-1 font-semibold">{r.title}</h3>
                <span className="text-sm capitalize text-muted">{whenFmt.format(r.departsAt)}</span>
              </header>
              <p className="flex flex-wrap items-center gap-x-2 text-sm"><MapPin size={14} className="text-accent" /> {r.fromPlace} <span aria-label="vers">→</span> {r.toPlace}</p>
              <p className="text-sm text-muted">Conducteur : <strong className="text-fg">{mine ? "toi" : driver}</strong>{r.notes ? ` · ${r.notes}` : ""}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${left > 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-bg text-muted"}`}><Users size={12} /> {left > 0 ? `${left} place${left > 1 ? "s" : ""} libre${left > 1 ? "s" : ""}` : "Complet"}</span>
                {people.length > 0 && <span className="text-xs text-muted">Avec : {people.map((p) => p.name).join(", ")}</span>}
                {!mine && !joined && left > 0 && (
                  <form action={joinRide} className="ml-auto"><input type="hidden" name="id" value={r.id} /><button className="btn text-xs">Réserver une place</button></form>
                )}
                {joined && (
                  <form action={leaveRide} className="ml-auto"><input type="hidden" name="id" value={r.id} /><button className="btn-ghost text-xs">Annuler ma réservation</button></form>
                )}
              </div>
              {mine && (
                <details className="border-t border-line pt-3">
                  <summary className="cursor-pointer text-xs text-muted hover:text-fg">Modifier mon trajet</summary>
                  <div className="space-y-3 pt-3">
                    <RideForm id={r.id} title={r.title} fromPlace={r.fromPlace} toPlace={r.toPlace} departsAt={toParisInput(r.departsAt)} seats={r.seats} notes={r.notes ?? ""} />
                    <form action={deleteRide} className="border-t border-line pt-3"><input type="hidden" name="id" value={r.id} /><button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Annuler ce trajet</button></form>
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
