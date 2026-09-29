import Link from "next/link";
import { Bike, Car, ExternalLink, TramFront } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { nearbyStops, nearbyBikeStations, tripEstimates, type LatLng } from "@/lib/mobility";
import { bestTransitCached, type TransitPlan } from "@/lib/transit";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Mobilité" };

const fmtDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
// Durée d'un trajet : « 45 min », « 2 h 05 ».
const fmtTrip = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);
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

type Trip = Awaited<ReturnType<typeof tripEstimates>>;

const FASTEST = (
  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">Le plus rapide</span>
);

function TripCard({ title, trip, transit, isAdmin }: { title: string; trip: Trip; transit: TransitPlan | null; isAdmin: boolean }) {
  // Le mode le plus rapide parmi la voiture, le vélo et le transport (si un trajet direct existe).
  const times = [
    trip.car ? { mode: "car", min: trip.car.minutes } : null,
    trip.bike ? { mode: "bike", min: trip.bike.minutes } : null,
    transit ? { mode: "transit", min: transit.totalMin } : null,
  ].filter((x): x is { mode: string; min: number } => x !== null);
  const fastest = times.length > 1 ? times.reduce((a, b) => (b.min < a.min ? b : a)).mode : null;

  return (
    <section className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trip.car && (
          <li className="rounded-xl border border-line bg-bg p-4">
            <div className="flex items-center justify-between gap-2 text-sm text-muted">
              <span className="flex items-center gap-2"><Car size={18} className="text-accent" /> En voiture</span>
              {fastest === "car" && FASTEST}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{fmtTrip(trip.car.minutes)}</div>
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
            <div className="flex items-center justify-between gap-2 text-sm text-muted">
              <span className="flex items-center gap-2"><Bike size={18} className="text-accent" /> À vélo</span>
              {fastest === "bike" && FASTEST}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{fmtTrip(trip.bike.minutes)}</div>
            <div className="text-sm text-muted">{trip.bike.km} km</div>
          </li>
        )}
        <li className="rounded-xl border border-line bg-bg p-4">
          <div className="flex items-center justify-between gap-2 text-sm text-muted">
            <span className="flex items-center gap-2"><TramFront size={18} className="text-accent" /> En transport</span>
            {fastest === "transit" && FASTEST}
          </div>
          {transit ? (
            <div className="space-y-2">
              <div className="mt-1 text-2xl font-bold tabular-nums">{fmtTrip(transit.totalMin)}</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {transit.lines.map((l) => (
                  <span key={l.code} title={l.name} className={`inline-flex min-w-9 justify-center rounded-lg px-2 py-0.5 text-sm font-bold ${l.tram ? "bg-accent text-accent-fg" : "border border-line bg-surface"}`}>{l.code}</span>
                ))}
                <span className="text-muted">
                  {transit.departsInMin <= 0 ? "départ imminent" : `départ dans ${transit.departsInMin} min`}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {transit.walkStartMin} min à pied jusqu&apos;à <strong className="text-fg">{transit.from}</strong>
                {transit.waitMin > 0 && <>, {transit.waitMin} min d&apos;attente</>}, {transit.rideMin} min à bord jusqu&apos;à <strong className="text-fg">{transit.to}</strong>, puis {transit.walkEndMin} min à pied.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Pas de ligne directe en service pour le moment. Regarde l&apos;itinéraire complet, avec correspondances.</p>
          )}
          <a href={trip.transitUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 w-full text-xs">
            Itinéraire complet <ExternalLink size={13} />
          </a>
        </li>
      </ul>
      {trip.car && !trip.car.live && isAdmin && (
        <p className="text-xs text-muted">
          Le temps en voiture ne tient pas compte des embouteillages : ajoute <code className="rounded bg-bg px-1">TOMTOM_API_KEY</code> dans le fichier .env pour activer le trafic en direct (voir DEPLOY.md, section 13).
        </p>
      )}
    </section>
  );
}

export default async function MobilitePage() {
  const user = await requireUser();
  const s = await getSettings();

  const home: LatLng | null = user.homeLat != null && user.homeLng != null ? { lat: user.homeLat, lng: user.homeLng } : null;
  const school: LatLng | null = s.school_lat && s.school_lng ? { lat: Number(s.school_lat), lng: Number(s.school_lng) } : null;
  const company: LatLng | null = user.companyLat != null && user.companyLng != null ? { lat: user.companyLat, lng: user.companyLng } : null;
  const companyLabel = user.companyName || "l'entreprise";
  // Un trajet par destination connue : l'école et, si renseignée, l'entreprise d'alternance.
  const plan = async (dest: LatLng | null) =>
    home && dest ? { trip: await tripEstimates(home, dest), transit: await bestTransitCached(home, dest).catch(() => null) } : null;
  const [toSchool, toCompany] = await Promise.all([plan(school), plan(company)]);
  const trips = [
    ...(toSchool ? [{ title: "Domicile → École", ...toSchool }] : []),
    ...(toCompany ? [{ title: `Domicile → ${companyLabel}`, ...toCompany }] : []),
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <AutoRefresh seconds={30} />
      <header>
        <h1 className="text-2xl font-bold">Mobilité</h1>
        <p className="text-sm text-muted">Horaires en temps réel TBM et disponibilité des vélos, autour de chez toi et de l&apos;école.</p>
      </header>

      {trips.map((t) => (
        <TripCard key={t.title} title={t.title} trip={t.trip} transit={t.transit} isAdmin={user.role === "admin"} />
      ))}

      {!home && (
        <div className="card border-accent text-sm">
          Renseigne ton adresse dans ton <Link href="/profil" className="font-medium text-accent underline">profil</Link> pour voir les transports près de chez toi.
        </div>
      )}
      {home && !company && (
        <div className="card text-sm text-muted">
          Tu es en alternance ? Ajoute l&apos;adresse de ton entreprise dans ton <Link href="/profil" className="text-accent underline">profil</Link> pour voir le trajet et les transports jusqu&apos;à ton lieu de travail.
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
        {company && <Place title={`Près de ${companyLabel}`} address={user.companyAddress ?? ""} origin={company} />}
      </div>

      <p className="text-xs text-muted">
        Sources : Bordeaux Métropole (SIRI Lite, GBFS), Base Adresse Nationale, OpenStreetMap{process.env.TOMTOM_API_KEY ? ", TomTom (trafic)" : ""}. Mise à jour automatique toutes les 30 s.
      </p>
    </div>
  );
}
