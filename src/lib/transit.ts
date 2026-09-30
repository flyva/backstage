import "server-only";
import { KEY, SIRI, cached, distanceM, fetchVisits, getJson, getLines, getStopPoints, type LatLng } from "@/lib/mobility";

// Trajet en transport TBM (bus/tram) avec une ligne directe. Sources : SIRI Lite de Bordeaux Métropole
// (lignes de chaque arrêt, horaires théoriques des courses, prochains passages en direct).

export type TransitPlan = {
  lines: { code: string; name: string; tram: boolean }[];
  from: string; // arrêt de montée
  to: string; // arrêt de descente
  walkStartMin: number;
  waitMin: number;
  rideMin: number;
  walkEndMin: number;
  totalMin: number;
  departsInMin: number; // départ de l'arrêt, dans N minutes
  transfers: number; // correspondances
};

// Marche à ~4,7 km/h, avec un détour de 25 % par rapport à la ligne droite.
export const walkMinutes = (meters: number) => Math.max(1, Math.ceil((meters * 1.25) / 78));

type EtCall = { StopPointRef?: { value: string }; AimedArrivalTime?: string; AimedDepartureTime?: string };
type EtJson = {
  Siri?: {
    ServiceDelivery?: {
      EstimatedTimetableDelivery?: { EstimatedJourneyVersionFrame?: { EstimatedVehicleJourney?: { EstimatedCalls?: { EstimatedCall?: EtCall[] } }[] }[] }[];
    };
  };
};

/**
 * Durée à bord entre un arrêt de montée et un arrêt de descente, d'après les horaires théoriques des courses.
 * Seule la DIFFÉRENCE d'horaires théoriques est utilisée : elle ne dépend pas du fuseau ni du retard.
 * Renvoie aussi le quai de montée et de descente réellement empruntés (bon quai, bon sens).
 */
export function extractRides(json: unknown, originRefs: Set<string>, destRefs: Set<string>): { rideMin: number; from: string; to: string }[] {
  const frames = (json as EtJson)?.Siri?.ServiceDelivery?.EstimatedTimetableDelivery?.[0]?.EstimatedJourneyVersionFrame ?? [];
  const found: { rideMin: number; from: string; to: string }[] = [];
  for (const frame of frames) {
    for (const j of frame.EstimatedVehicleJourney ?? []) {
      const calls = j.EstimatedCalls?.EstimatedCall ?? [];
      const i = calls.findIndex((c) => c.StopPointRef && originRefs.has(c.StopPointRef.value));
      if (i < 0) continue;
      const k = calls.findIndex((c, idx) => idx > i && c.StopPointRef && destRefs.has(c.StopPointRef.value));
      if (k < 0) continue;
      const dep = Date.parse(calls[i].AimedDepartureTime ?? calls[i].AimedArrivalTime ?? "");
      const arr = Date.parse(calls[k].AimedArrivalTime ?? calls[k].AimedDepartureTime ?? "");
      if (Number.isNaN(dep) || Number.isNaN(arr) || arr <= dep) continue;
      found.push({ rideMin: Math.max(1, Math.round((arr - dep) / 60000)), from: calls[i].StopPointRef!.value, to: calls[k].StopPointRef!.value });
    }
  }
  return found;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function lineRides(lineRef: string, originRefs: Set<string>, destRefs: Set<string>) {
  const all = await Promise.all(
    ["0", "1"].map(async (dir) => {
      const data = await cached(`et:${lineRef}:${dir}`, 60e3, () =>
        getJson<unknown>(`${SIRI}/estimated-timetable.json?AccountKey=${KEY}&LineRef=${encodeURIComponent(lineRef)}&DirectionRef=${dir}`),
      );
      return data ? extractRides(data, originRefs, destRefs) : [];
    }),
  );
  return all.flat();
}

/** Prochains départs (en minutes) d'un arrêt pour une ligne donnée. */
async function nextDeparturesOf(stopRef: string, lineRef: string): Promise<number[]> {
  const now = Date.now();
  const visits = await fetchVisits(stopRef);
  return visits
    .filter((v) => v.MonitoredVehicleJourney.LineRef.value === lineRef)
    .map((v) => {
      const c = v.MonitoredVehicleJourney.MonitoredCall;
      const iso = c.ExpectedDepartureTime ?? c.ExpectedArrivalTime ?? c.AimedDepartureTime;
      return iso ? Math.round((new Date(iso).getTime() - now) / 60000) : NaN;
    })
    .filter((m) => Number.isFinite(m) && m >= -1 && m <= 120)
    .sort((x, y) => x - y);
}

/**
 * Meilleur trajet en transport TBM entre deux points, avec une ligne directe (sans correspondance) : marche jusqu'à un
 * arrêt proche, prochain passage réel, trajet à bord, marche finale. Renvoie null s'il n'y a pas de ligne directe ou
 * pas de service en ce moment (les correspondances ne sont pas calculées : voir le lien d'itinéraire complet).
 */
export async function bestTransit(a: LatLng, b: LatLng): Promise<TransitPlan | null> {
  const [points, lineInfo] = await Promise.all([getStopPoints(), getLines()]);
  const near = (p: LatLng) =>
    points
      .map((s) => ({ s, d: distanceM(p, s) }))
      .filter((x) => x.d <= 800)
      .sort((x, y) => x.d - y.d)
      .slice(0, 25);
  const fromStops = near(a);
  const toStops = near(b);
  if (fromStops.length === 0 || toStops.length === 0) return null;

  // Lignes qui desservent un arrêt près du départ ET un arrêt près de l'arrivée.
  const byLine = new Map<string, { o: typeof fromStops; d: typeof toStops }>();
  const slot = (line: string) => {
    let v = byLine.get(line);
    if (!v) { v = { o: [], d: [] }; byLine.set(line, v); }
    return v;
  };
  for (const x of fromStops) for (const l of x.s.lines) slot(l).o.push(x);
  for (const x of toStops) for (const l of x.s.lines) byLine.get(l)?.d.push(x);

  const candidates = [...byLine.entries()]
    .filter(([, v]) => v.o.length > 0 && v.d.length > 0)
    .map(([line, v]) => ({ line, o: v.o, d: v.d, walk: Math.min(...v.o.map((x) => x.d)) + Math.min(...v.d.map((x) => x.d)) }))
    .sort((x, y) => x.walk - y.walk)
    .slice(0, 4);

  let best: TransitPlan | null = null;
  for (const c of candidates) {
    const rides = await lineRides(c.line, new Set(c.o.map((x) => x.s.ref)), new Set(c.d.map((x) => x.s.ref)));
    const pairs = [...new Set(rides.map((r) => `${r.from}|${r.to}`))];
    for (const pair of pairs) {
      const [fromRef, toRef] = pair.split("|");
      const ride = median(rides.filter((r) => r.from === fromRef && r.to === toRef).map((r) => r.rideMin));
      const o = c.o.find((x) => x.s.ref === fromRef)!;
      const d = c.d.find((x) => x.s.ref === toRef)!;
      const walkStart = walkMinutes(o.d);
      const walkEnd = walkMinutes(d.d);
      const departures = await nextDeparturesOf(fromRef, c.line);
      const dep = departures.find((m) => m >= walkStart - 1); // il faut avoir le temps d'arriver à l'arrêt
      if (dep === undefined) continue;
      const total = Math.max(dep, walkStart) + ride + walkEnd;
      if (!best || total < best.totalMin) {
        const info = lineInfo.get(c.line);
        best = {
          lines: [{ code: info?.code ?? c.line.split(":")[2], name: info?.name ?? "", tram: info?.tram ?? false }],
          from: o.s.name,
          to: d.s.name,
          walkStartMin: walkStart,
          waitMin: Math.max(0, dep - walkStart),
          rideMin: ride,
          walkEndMin: walkEnd,
          totalMin: total,
          departsInMin: Math.max(0, dep),
          transfers: 0,
        };
      }
    }
  }
  return best;
}

type MotisLeg = { mode: string; duration: number; startTime: string; routeShortName?: string; displayName?: string; routeLongName?: string; from: { name: string }; to: { name: string } };
type MotisItinerary = { startTime: string; endTime: string; transfers: number; legs: MotisLeg[] };

// Les heures de l'API (TBM, Transitous) sont des heures locales étiquetées « Z » : on compare donc avec l'heure locale de Bordeaux.
function parisWallNow(): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}

/**
 * Itinéraire complet, avec correspondances, calculé par Transitous (MOTIS, service public gratuit qui agrège les horaires
 * théoriques et temps réel de TBM). Renvoie le trajet qui arrive le plus tôt. Les coordonnées sont arrondies (~10 m).
 */
export async function bestTransitous(a: LatLng, b: LatLng): Promise<TransitPlan | null> {
  const r = (n: number) => n.toFixed(4);
  const url = `https://api.transitous.org/api/v5/plan?fromPlace=${r(a.lat)},${r(a.lng)}&toPlace=${r(b.lat)},${r(b.lng)}&numItineraries=4&maxTransfers=3&transitModes=TRANSIT`;
  const res = await fetch(url, { headers: { "User-Agent": "Backstage-school-dashboard" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`transitous ${res.status}`);
  const data = (await res.json()) as { itineraries?: MotisItinerary[] };
  const now = parisWallNow();
  const lineInfo = await getLines().catch(() => new Map());
  let best: TransitPlan | null = null;
  for (const it of data.itineraries ?? []) {
    const transit = it.legs.filter((l) => l.mode !== "WALK");
    if (transit.length === 0) continue; // trajet entièrement à pied : déjà couvert par la carte « à pied »/vélo
    const total = Math.max(1, Math.round((Date.parse(it.endTime) - now) / 60000));
    const firstIdx = it.legs.findIndex((l) => l.mode !== "WALK");
    const lastIdx = it.legs.length - 1 - [...it.legs].reverse().findIndex((l) => l.mode !== "WALK");
    const walkStart = it.legs.slice(0, firstIdx).reduce((n, l) => n + l.duration, 0) / 60;
    const walkEnd = it.legs.slice(lastIdx + 1).reduce((n, l) => n + l.duration, 0) / 60;
    const ride = transit.reduce((n, l) => n + l.duration, 0) / 60;
    const departs = Math.max(0, Math.round((Date.parse(it.legs[firstIdx].startTime) - now) / 60000));
    if (!best || total < best.totalMin) {
      best = {
        lines: transit.map((l) => {
          const code = l.routeShortName ?? l.displayName ?? "?";
          const info = [...lineInfo.values()].find((x: { code: string }) => x.code === code) as { name: string; tram: boolean } | undefined;
          return { code, name: info?.name ?? l.routeLongName ?? "", tram: info?.tram ?? l.mode === "TRAM" };
        }),
        from: transit[0].from.name,
        to: transit[transit.length - 1].to.name,
        walkStartMin: Math.round(walkStart),
        waitMin: Math.max(0, Math.round(total - walkStart - ride - walkEnd)),
        rideMin: Math.round(ride),
        walkEndMin: Math.round(walkEnd),
        totalMin: total,
        departsInMin: departs,
        transfers: it.transfers,
      };
    }
  }
  return best;
}

/** Version mémorisée 45 s : la page se rafraîchit toutes les 30 s. Transitous d'abord (avec correspondances), sinon ligne directe TBM. */
export async function bestTransitCached(a: LatLng, b: LatLng): Promise<TransitPlan | null> {
  const key = `transit:${a.lat.toFixed(4)},${a.lng.toFixed(4)}:${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
  return (await cached(key, 45e3, async () => (await bestTransitous(a, b).catch(() => undefined)) ?? (await bestTransit(a, b)))) ?? null;
}
