import Link from "next/link";
import { Bike, Footprints, TramFront, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { nearbyStops, nearbyBikeStations, tripEstimates, type LatLng } from "@/lib/mobility";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Mobilité" };

const fmtDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
const fmtMinutes = (m: number) => (m <= 0 ? "Imminent" : `${m} min`);

async function Place({ title, address, origin }: { title: string; address: string; origin: LatLng }) {
  const [stops, bikes] = await Promise.all([nearbyStops(origin), nearbyBikeStations(origin)]);
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted">{address}</p>
      </div>

      <div className="card space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><TramFront size={16} className="text-accent" /> Bus et tram à proximité</h3>
        {stops.length === 0 && <p className="text-sm text-muted">Aucun arrêt TBM à moins de 800 m.</p>}
        {stops.map((s) => (
          <div key={s.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted">{fmtDistance(s.distance)}</span>
            </div>
            {s.departures.length === 0 && <p className="text-sm text-muted">Pas de passage prévu prochainement.</p>}
            <ul className="space-y-1">
              {s.departures.slice(0, 5).map((d) => (
                <li key={d.line + d.destination} className="flex items-center gap-3 text-sm">
                  <span
                    title={d.lineName}
                    className={`inline-flex min-w-9 justify-center rounded-md px-2 py-0.5 text-xs font-bold ${
                      d.tram ? "bg-accent text-accent-fg" : "border border-line text-fg"
                    }`}
                  >
                    {d.line}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted">{d.destination}</span>
                  <span className="shrink-0 font-medium tabular-nums">{d.minutes.map(fmtMinutes).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Bike size={16} className="text-accent" /> Stations Le Vélo (V³)</h3>
        {bikes.length === 0 && <p className="text-sm text-muted">Aucune station à moins de 900 m (ou données indisponibles).</p>}
        <ul className="divide-y divide-line text-sm">
          {bikes.map((b) => (
            <li key={b.name} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1 truncate">{b.name}</span>
              <span className="text-xs text-muted">{fmtDistance(b.distance)}</span>
              <span className={`w-24 text-right tabular-nums ${b.bikes === 0 ? "text-danger" : ""}`} title="Vélos disponibles (dont électriques)">
                {b.bikes} vélo{b.bikes > 1 ? "s" : ""}{b.electric > 0 && <span className="text-muted"> ({b.electric} ⚡)</span>}
              </span>
              <span className="w-16 text-right text-xs tabular-nums text-muted" title="Places libres">{b.docks} places</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function MobilitePage() {
  const user = await requireUser();
  const s = await getSettings();

  const home: LatLng | null = user.homeLat != null && user.homeLng != null ? { lat: user.homeLat, lng: user.homeLng } : null;
  const school: LatLng | null = s.school_lat && s.school_lng ? { lat: Number(s.school_lat), lng: Number(s.school_lng) } : null;
  const trip = home && school ? await tripEstimates(home, school) : null;

  return (
    <div className="max-w-4xl space-y-8">
      <AutoRefresh seconds={30} />
      <header>
        <h1 className="text-2xl font-bold">Mobilité</h1>
        <p className="text-sm text-muted">Horaires en temps réel TBM et disponibilité des vélos, autour de chez toi et de l&apos;école.</p>
      </header>

      {trip && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Domicile → École</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {trip.foot && <span className="flex items-center gap-2"><Footprints size={16} className="text-accent" /> À pied : <strong>{trip.foot.minutes} min</strong> ({trip.foot.km} km)</span>}
            {trip.bike && <span className="flex items-center gap-2"><Bike size={16} className="text-accent" /> À vélo : <strong>{trip.bike.minutes} min</strong> ({trip.bike.km} km)</span>}
          </div>
          <a href={trip.transitUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost w-fit">
            <TramFront size={16} /> Itinéraire en transports <ExternalLink size={14} />
          </a>
        </section>
      )}

      {!home && (
        <div className="card border-accent text-sm">
          Renseigne ton adresse dans ton <Link href="/profil" className="font-medium text-accent underline">profil</Link> pour voir les transports près de chez toi.
        </div>
      )}
      {!school && (
        <div className="card text-sm text-muted">
          L&apos;adresse de l&apos;école n&apos;est pas configurée{user.role === "admin" && <> (<Link href="/admin" className="text-accent underline">Admin → Paramètres</Link>)</>}.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {home && <Place title="Près de chez toi" address={user.homeAddress ?? ""} origin={home} />}
        {school && <Place title="Près de l'école" address={s.school_address ?? ""} origin={school} />}
      </div>

      <p className="text-xs text-muted">
        Sources : Bordeaux Métropole (SIRI Lite, GBFS), Base Adresse Nationale, OpenStreetMap. Mise à jour automatique toutes les 30 s.
      </p>
    </div>
  );
}
