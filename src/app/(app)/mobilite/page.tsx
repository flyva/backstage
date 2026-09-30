import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { Bike, Car, ExternalLink, Route, Ship, TramFront } from "lucide-react";
import { db } from "@/db";
import { workDays } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { getSettings } from "@/lib/settings";
import { geocode, nearbyStops, nearbyBikeStations, tripEstimates, type LatLng } from "@/lib/mobility";
import { alertsNear } from "@/lib/alerts";
import { allow } from "@/lib/rate-limit";
import { TransitAlerts } from "@/components/TransitAlerts";
import { AddressField } from "@/components/AddressField";
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

async function Place({ title, address, origin, plan, today }: { title: string; address: string; origin: LatLng; plan?: { trip: Trip; transit: TransitPlan | null; from: string }; today?: boolean }) {
  const [stops, bikes, alerts] = await Promise.all([nearbyStops(origin), nearbyBikeStations(origin), alertsNear([origin])]);
  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold">{title}{today && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-fg">Aujourd&apos;hui</span>}</h2>
        <p className="text-sm text-muted">{address}</p>
      </div>

      <div className="card space-y-5 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold"><TramFront size={20} className="text-accent" /> Bus, tram et bateau à proximité</h3>
        {plan && <BestRoute plan={plan} />}
        <TransitAlerts alerts={alerts} title="Alertes TBM près d'ici" />
        {stops.length === 0 && <p className="text-base text-muted">Aucun arrêt TBM à moins de 800 m.</p>}
        {stops.map((s) => (
          <div key={s.name} className="space-y-2.5 rounded-xl border border-line bg-bg p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-semibold leading-tight">{s.name}</span>
              <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-sm text-muted">{fmtDistance(s.distance)}</span>
            </div>
            {s.departures.length === 0 && <p className="text-base text-muted">Pas de passage prévu prochainement.</p>}
            {/* Un groupe par ligne (avec ses directions), séparés par un trait. */}
            {[...Map.groupBy(s.departures, (d) => d.line)].slice(0, 5).map(([line, list], gi) => (
              <div key={line}>
                {gi > 0 && <hr className="mb-2.5 border-line" />}
                <div className="flex items-start gap-3">
                  <LineBadge code={line} name={list[0].lineName} tram={list[0].tram} boat={list[0].boat} className="min-w-11 shrink-0 px-2.5 py-1 text-base" />
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {list.map((d) => (
                      <li key={d.destination} className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-base">{d.destination}</span>
                        <span className="shrink-0 text-base font-semibold tabular-nums">{d.minutes.map(fmtMinutes).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
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

// Durée totale de porte à porte en transport depuis l'adresse de départ, avec le meilleur trajet (lignes, marche, attente),
// comparée à la voiture et au vélo comme dans les cartes de trajet.
/** Pastille de ligne : tram plein, bus contour, bateau (LE BATO) contour avec icône de bateau. */
function LineBadge({ code, name, tram, boat, className }: { code: string; name: string; tram: boolean; boat: boolean; className: string }) {
  if (boat) {
    const label = name.replace(/^le /i, "").toUpperCase() || code;
    return <span title={name || label} className={`inline-flex items-center justify-center gap-1 rounded-lg border border-accent bg-accent/10 font-bold text-fg ${className}`}><Ship size={14} aria-hidden /> {label}</span>;
  }
  return <span title={name} className={`inline-flex justify-center rounded-lg font-bold ${tram ? "bg-accent text-accent-fg" : "border border-line bg-surface text-fg"} ${className}`}>{code}</span>;
}

function BestRoute({ plan }: { plan: { trip: Trip; transit: TransitPlan | null; from: string } }) {
  const { trip, transit, from } = plan;
  const others = [trip.car?.minutes, trip.bike?.minutes].filter((x): x is number => typeof x === "number");
  const fastest = transit !== null && (others.length === 0 || transit.totalMin <= Math.min(...others));
  return (
    <div className="rounded-xl border border-accent/60 bg-accent/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>En transport depuis {from}</span>
        {fastest && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">Le plus rapide</span>}
      </div>
      {transit ? (
        <>
          <div className="mt-1 text-3xl font-bold tabular-nums">{fmtTrip(transit.totalMin)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {transit.lines.map((l) => (
              <LineBadge key={l.code} code={l.code} name={l.name} tram={l.tram} boat={l.boat} className="min-w-9 px-2 py-0.5" />
            ))}
            <span className="text-muted">{transit.transfers > 0 ? `${transit.transfers} correspondance${transit.transfers > 1 ? "s" : ""} · ` : "direct · "}{transit.departsInMin <= 0 ? "départ imminent" : `départ dans ${transit.departsInMin} min`}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {transit.walkStartMin} min à pied jusqu&apos;à <strong className="text-fg">{transit.from}</strong>
            {transit.waitMin > 0 && <>, {transit.waitMin} min d&apos;attente</>}, {transit.rideMin} min à bord jusqu&apos;à <strong className="text-fg">{transit.to}</strong>, puis {transit.walkEndMin} min à pied.
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">Pas de trajet en transport en commun disponible pour le moment.</p>
      )}
      {(trip.car || trip.bike) && (
        <p className="mt-2 text-xs text-muted">
          À comparer : {[trip.car && `voiture ${fmtTrip(trip.car.minutes)}`, trip.bike && `vélo ${fmtTrip(trip.bike.minutes)}`].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

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
                  <LineBadge key={l.code} code={l.code} name={l.name} tram={l.tram} boat={l.boat} className="min-w-9 px-2 py-0.5 text-sm" />
                ))}
                <span className="text-muted">
                  {transit.transfers > 0 ? `${transit.transfers} correspondance${transit.transfers > 1 ? "s" : ""} · ` : "direct · "}{transit.departsInMin <= 0 ? "départ imminent" : `départ dans ${transit.departsInMin} min`}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {transit.walkStartMin} min à pied jusqu&apos;à <strong className="text-fg">{transit.from}</strong>
                {transit.waitMin > 0 && <>, {transit.waitMin} min d&apos;attente</>}, {transit.rideMin} min à bord jusqu&apos;à <strong className="text-fg">{transit.to}</strong>, puis {transit.walkEndMin} min à pied.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Aucun trajet en transport en commun disponible pour le moment (pas de service). Regarde l&apos;itinéraire complet.</p>
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

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim().slice(0, 200) : "");

export default async function MobilitePage({ searchParams }: PageProps<"/mobilite">) {
  const user = await requireUser();
  const sp = await searchParams;
  const fromQ = param(sp.de);
  const toQ = param(sp.vers);
  const s = await getSettings();

  const home: LatLng | null = user.homeLat != null && user.homeLng != null ? { lat: user.homeLat, lng: user.homeLng } : null;
  const school: LatLng | null = s.school_lat && s.school_lng ? { lat: Number(s.school_lat), lng: Number(s.school_lng) } : null;
  const company: LatLng | null = user.companyLat != null && user.companyLng != null ? { lat: user.companyLat, lng: user.companyLng } : null;
  const companyLabel = user.companyName || "l'entreprise";
  // Un trajet par destination connue : l'école et, si renseignée, l'entreprise d'alternance.
  const plan = async (dest: LatLng | null) =>
    home && dest ? { trip: await tripEstimates(home, dest), transit: await bestTransitCached(home, dest).catch(() => null) } : null;
  const [toSchool, toCompany] = await Promise.all([plan(school), plan(company)]);

  // Aujourd'hui : école → le trajet et les arrêts de l'école d'abord ; sinon → ceux de l'entreprise (ou de l'école s'il n'y en a pas).
  const [dayRow] = await db.select({ kind: workDays.kind }).from(workDays).where(and(eq(workDays.userId, user.id), eq(workDays.day, todayParis()))).limit(1);
  const primary: "school" | "company" = dayRow?.kind === "ecole" && school ? "school" : company ? "company" : "school";
  const tripSchool = toSchool ? [{ id: "school", title: "Domicile → École", ...toSchool }] : [];
  const tripCompany = toCompany ? [{ id: "company", title: `Domicile → ${companyLabel}`, ...toCompany }] : [];
  const trips = primary === "school" ? [...tripSchool, ...tripCompany] : [...tripCompany, ...tripSchool];

  // Calculateur libre : d'une adresse quelconque à une autre (le départ vide = chez toi).
  let free: { title: string; trip: Trip; transit: TransitPlan | null } | { error: string } | null = null;
  if (toQ) {
    if (!allow(`trip:${user.id}`, 60, 10 * 60e3)) {
      free = { error: "Trop de recherches : réessaie dans quelques minutes." };
    } else {
      const [a, b] = await Promise.all([fromQ ? geocode(fromQ) : Promise.resolve(home ? { ...home, label: "chez toi" } : null), geocode(toQ)]);
      if (!a || !b) {
        free = { error: !a && !fromQ ? "Renseigne ton adresse dans ton profil ou indique un départ." : "Adresse introuvable : choisis une suggestion dans la liste." };
      } else {
        free = { title: `${a.label} → ${b.label}`, trip: await tripEstimates(a, b), transit: await bestTransitCached(a, b).catch(() => null) };
      }
    }
  }

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={30} />
      <header>
        <h1 className="text-2xl font-bold">Mobilité</h1>
        <p className="text-sm text-muted">
          {dayRow?.kind === "ecole" ? "Aujourd'hui : école. " : dayRow?.kind === "entreprise" ? "Aujourd'hui : entreprise. " : ""}
          Horaires en temps réel TBM et disponibilité des vélos, autour de chez toi et de {primary === "school" ? "l'école" : "ton entreprise"}.
        </p>
      </header>

      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Route size={20} className="text-accent" /> Calculer un trajet</h2>
        <form action="/mobilite" method="get" className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <AddressField id="de" name="de" label="Départ" defaultValue={fromQ} placeholder={home ? "Vide = chez toi" : "12 rue Exemple, Bordeaux"} />
          <AddressField id="vers" name="vers" label="Arrivée" defaultValue={toQ} placeholder="Une adresse, un lieu, une salle…" />
          <button className="btn">Calculer</button>
        </form>
        {free && "error" in free && <p className="text-sm text-danger" role="alert">{free.error}</p>}
      </section>
      {free && !("error" in free) && <TripCard title={free.title} trip={free.trip} transit={free.transit} isAdmin={user.perms.administration} />}

      {trips.map((t) => (
        <TripCard key={t.id} title={t.title} trip={t.trip} transit={t.transit} isAdmin={user.perms.administration} />
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
          L&apos;adresse de l&apos;école n&apos;est pas configurée{user.perms.administration && <> (<Link href="/admin" className="text-accent underline">Admin → Paramètres</Link>)</>}.
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
        {primary === "school" ? (
          <>
            {school && <Place title="Près de l'école" address={s.school_address ?? ""} origin={school} plan={toSchool ? { ...toSchool, from: "chez toi" } : undefined} today={!!dayRow} />}
            {home && <Place title="Près de chez toi" address={user.homeAddress ?? ""} origin={home} />}
            {company && <Place title={`Près de ${companyLabel}`} address={user.companyAddress ?? ""} origin={company} plan={toCompany ? { ...toCompany, from: "chez toi" } : undefined} />}
          </>
        ) : (
          <>
            {company && <Place title={`Près de ${companyLabel}`} address={user.companyAddress ?? ""} origin={company} plan={toCompany ? { ...toCompany, from: "chez toi" } : undefined} today={!!dayRow} />}
            {home && <Place title="Près de chez toi" address={user.homeAddress ?? ""} origin={home} />}
            {school && <Place title="Près de l'école" address={s.school_address ?? ""} origin={school} plan={toSchool ? { ...toSchool, from: "chez toi" } : undefined} />}
          </>
        )}
      </div>

      <p className="text-xs text-muted">
        Sources : Bordeaux Métropole (SIRI Lite, GBFS), Base Adresse Nationale, OpenStreetMap{process.env.TOMTOM_API_KEY ? ", TomTom (trafic)" : ""}. Mise à jour automatique toutes les 30 s.
      </p>
    </div>
  );
}
