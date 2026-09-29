import Link from "next/link";
import { Bike, Car, ExternalLink, Footprints, TramFront } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { nearbyStops, nearbyBikeStations, tripEstimates, type LatLng } from "@/lib/mobility";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Mobilité" };

const fmtDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
const fmtMinutes = (m: number) => (m <= 0 ? "Imminent" : `${m} min`);

const TRAFFIC = {
  fluide: { label: "Circulation fluide", cls: "bg-[#28a745] text-white" },
  ralenti: { label: "Ralentissements", cls: "bg-[#f59e0b] text-[#14110a]" },
  bouchons: { label: "Embouteillages", cls: "bg-[#dc3545] text-white" },
} as const;

async function Place({ title, address, origin }: { title: string; address: string; origin: LatLng }) {
  const [stops, bikes] = await Promise.all([nearbyStops(origin), nearbyBikeStations(origin)]);
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted">{address}</p>
      </div>

      <div className="card space-y-5 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold"><TramFront size={20} className="text-accent" /> Bus et tram à proximité</h3>
        {stops.length === 0 && <p className="text-base text-muted">Aucun arrêt TBM à moins de 800 m.</p>}
        {stops.map((s) => (
          <div key={s.name} className="space-y-2.5 rounded-xl border border-line bg-bg p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-semibold leading-tight">{s.name}</span>
              <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-sm text-muted">{fmtDistance(s.distance)}</span>
            </div>
            {s.departures.length === 0 && <p className="text-base text-muted">Pas de passage prévu prochainement.</p>}
            <ul className="space-y-2">
              {s.departures.slice(0, 5).map((d) => (
                <li key={d.line + d.destination} className="flex items-center gap-3">
                  <span
                    title={d.lineName}
                    className={`inline-flex min-w-11 justify-center rounded-lg px-2.5 py-1 text-base font-bold ${
                      d.tram ? "bg-accent text-accent-fg" : "border border-line bg-surface text-fg"
                    }`}
                  >
                    {d.line}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base">{d.destination}</span>
                  <span className="shrink-0 text-base font-semibold tabular-nums">{d.minutes.map(fmtMinutes).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card space-y-3 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold"><Bike size={20} className="text-accent" /> Stations Le Vélo (V³)</h3>
        {bikes.length === 0 && <p className="text-base text-muted">Aucune station à moins de 900 m (ou données indisponibles).</p>}
        <ul className="space-y-2">
          {bikes.map((b) => (
            <li key={b.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-bg px-4 py-3">
              <span className="min-w-0 flex-1 basis-40">
                <span className="block text-lg font-semibold leading-tight">{b.name}</span>
                <span className="text-sm text-muted">{fmtDistance(b.distance)}</span>
              </span>
              <span className={`text-lg font-semibold tabular-nums ${b.bikes === 0 ? "text-danger" : ""}`} title="Vélos disponibles (dont électriques)">
                {b.bikes} vélo{b.bikes > 1 ? "s" : ""}{b.electric > 0 && <span className="text-sm font-normal text-muted"> ({b.electric} ⚡)</span>}
              </span>
              <span className="text-base tabular-nums text-muted" title="Places libres">{b.docks} places</span>
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
    <div className="max-w-5xl space-y-8">
      <AutoRefresh seconds={30} />
      <header>
        <h1 className="text-2xl font-bold">Mobilité</h1>
        <p className="text-sm text-muted">Horaires en temps réel TBM et disponibilité des vélos, autour de chez toi et de l&apos;école.</p>
      </header>

      {trip && (
        <section className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Domicile → École</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trip.car && (
              <li className="rounded-xl border border-line bg-bg p-4">
                <div className="flex items-center gap-2 text-sm text-muted"><Car size={18} className="text-accent" /> En voiture</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{trip.car.minutes} min</div>
                <div className="text-sm text-muted">{trip.car.km} km</div>
                {trip.car.level ? (
                  <div className="mt-2 space-y-1">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TRAFFIC[trip.car.level].cls}`}>{TRAFFIC[trip.car.level].label}</span>
                    {trip.car.delayMinutes > 0 && <div className="text-xs text-muted">dont +{trip.car.delayMinutes} min de trafic</div>}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted" title="Le trafic en direct demande une clé TomTom (TOMTOM_API_KEY)">Sans trafic (estimation)</div>
                )}
              </li>
            )}
            {trip.bike && (
              <li className="rounded-xl border border-line bg-bg p-4">
                <div className="flex items-center gap-2 text-sm text-muted"><Bike size={18} className="text-accent" /> À vélo</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{trip.bike.minutes} min</div>
                <div className="text-sm text-muted">{trip.bike.km} km</div>
              </li>
            )}
            {trip.foot && (
              <li className="rounded-xl border border-line bg-bg p-4">
                <div className="flex items-center gap-2 text-sm text-muted"><Footprints size={18} className="text-accent" /> À pied</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{trip.foot.minutes} min</div>
                <div className="text-sm text-muted">{trip.foot.km} km</div>
              </li>
            )}
            <li className="flex items-center rounded-xl border border-line bg-bg p-4">
              <a href={trip.transitUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">
                <TramFront size={16} /> Transports <ExternalLink size={14} />
              </a>
            </li>
          </ul>
          {trip.car && !trip.car.live && user.role === "admin" && (
            <p className="text-xs text-muted">
              Le temps en voiture ne tient pas compte des embouteillages : ajoute <code className="rounded bg-bg px-1">TOMTOM_API_KEY</code> dans le fichier .env pour activer le trafic en direct (voir DEPLOY.md, section 13).
            </p>
          )}
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

      <div className="grid gap-8 xl:grid-cols-2">
        {home && <Place title="Près de chez toi" address={user.homeAddress ?? ""} origin={home} />}
        {school && <Place title="Près de l'école" address={s.school_address ?? ""} origin={school} />}
      </div>

      <p className="text-xs text-muted">
        Sources : Bordeaux Métropole (SIRI Lite, GBFS), Base Adresse Nationale, OpenStreetMap{process.env.TOMTOM_API_KEY ? ", TomTom (trafic)" : ""}. Mise à jour automatique toutes les 30 s.
      </p>
    </div>
  );
}
