import "server-only";

// Sources ouvertes, sans inscription :
//  - TBM (bus/tram) : SIRI Lite de Bordeaux Métropole (clé publique partagée)
//  - Le Vélo TBM (ex V³) : GBFS 3.0
//  - Adresses : api-adresse.data.gouv.fr (BAN)
//  - Itinéraires piéton / vélo : routing.openstreetmap.de (OSRM)
const KEY = "opendata-bordeaux-metropole-flux-gtfs-rt";
const SIRI = "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux";
const GBFS = "https://bdx.mecatran.com/utw/ws/gbfs/bordeaux/v3";

export type LatLng = { lat: number; lng: number };

// ---------- utilitaires ----------

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json() as Promise<T>;
}

// Cache mémoire par processus (survit au HMR en dev). En cas d'erreur réseau,
// on renvoie la dernière valeur connue plutôt que de casser la page.
type Entry = { at: number; value?: unknown; pending?: Promise<unknown> };
const g = globalThis as unknown as { __mobilityCache?: Map<string, Entry> };
const store = (g.__mobilityCache ??= new Map<string, Entry>());

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T | undefined> {
  const hit = store.get(key);
  if (hit?.value !== undefined && Date.now() - hit.at < ttlMs) return hit.value as T;
  if (hit?.pending) return hit.pending as Promise<T | undefined>;
  const pending = load()
    .then((value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    })
    .catch(() => {
      store.set(key, { at: hit?.at ?? 0, value: hit?.value });
      return hit?.value as T | undefined;
    });
  store.set(key, { at: hit?.at ?? 0, value: hit?.value, pending });
  return pending;
}

export function distanceM(a: LatLng, b: LatLng) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- adresses ----------

export async function geocode(address: string): Promise<(LatLng & { label: string }) | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const data = await getJson<{ features: { geometry: { coordinates: [number, number] }; properties: { label: string } }[] }>(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`,
    );
    const f = data.features[0];
    if (!f) return null;
    return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], label: f.properties.label };
  } catch {
    return null;
  }
}

// ---------- bus / tram ----------

type StopPoint = { ref: string; name: string; lat: number; lng: number };
type LineInfo = { code: string; name: string; tram: boolean };

async function getStopPoints(): Promise<StopPoint[]> {
  const list = await cached("stops", 24 * 3600e3, async () => {
    const j = await getJson<{
      Siri: { StopPointsDelivery: { AnnotatedStopPointRef: {
        StopPointRef: { value: string };
        StopName: { value: string };
        Lines?: unknown[];
        Location: { latitude: number; longitude: number };
      }[] } };
    }>(`${SIRI}/stoppoints-discovery.json?AccountKey=${KEY}`);
    return j.Siri.StopPointsDelivery.AnnotatedStopPointRef
      .filter((s) => s.Lines && s.Lines.length > 0)
      .map((s) => ({ ref: s.StopPointRef.value, name: s.StopName.value, lat: s.Location.latitude, lng: s.Location.longitude }));
  });
  return list ?? [];
}

async function getLines(): Promise<Map<string, LineInfo>> {
  const list = await cached("lines", 24 * 3600e3, async () => {
    const j = await getJson<{
      Siri: { LinesDelivery: { AnnotatedLineRef: { LineRef: { value: string }; LineName: { value: string }[]; LineCode?: { value: string } }[] } };
    }>(`${SIRI}/lines-discovery.json?AccountKey=${KEY}`);
    return j.Siri.LinesDelivery.AnnotatedLineRef.map((l) => {
      const name = l.LineName[0]?.value ?? l.LineRef.value;
      return [l.LineRef.value, { code: l.LineCode?.value ?? name, name, tram: /^tram /i.test(name) }] as const;
    });
  });
  return new Map(list ?? []);
}

export type Departure = { line: string; lineName: string; tram: boolean; destination: string; minutes: number[] };
export type StopResult = { name: string; distance: number; departures: Departure[] };

async function fetchVisits(ref: string) {
  const data = await cached(`sm:${ref}`, 20e3, () =>
    getJson<{
      Siri: { ServiceDelivery: { StopMonitoringDelivery: { MonitoredStopVisit?: {
        MonitoredVehicleJourney: {
          LineRef: { value: string };
          DestinationName?: { value: string }[];
          MonitoredCall: { ExpectedDepartureTime?: string; ExpectedArrivalTime?: string; AimedDepartureTime?: string };
        };
      }[] }[] } };
    }>(`${SIRI}/stop-monitoring.json?AccountKey=${KEY}&MonitoringRef=${encodeURIComponent(ref)}`),
  );
  return data?.Siri.ServiceDelivery.StopMonitoringDelivery[0]?.MonitoredStopVisit ?? [];
}

export async function nearbyStops(origin: LatLng, opts: { maxDistance?: number; maxStops?: number } = {}): Promise<StopResult[]> {
  const { maxDistance = 800, maxStops = 3 } = opts;
  const [points, lines] = await Promise.all([getStopPoints(), getLines()]);

  const near = points
    .map((p) => ({ p, d: distanceM(origin, p) }))
    .filter((x) => x.d <= maxDistance);

  // Un « arrêt » = même nom ; on garde les quais (sens) situés à moins de 120 m du plus proche.
  const byName = Map.groupBy(near, (x) => x.p.name);
  const groups = [...byName]
    .map(([name, items]) => {
      const min = Math.min(...items.map((i) => i.d));
      return { name, distance: min, refs: items.filter((i) => i.d <= min + 120).map((i) => i.p.ref).slice(0, 4) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxStops);

  const now = Date.now();
  return Promise.all(
    groups.map(async (grp) => {
      const visits = (await Promise.all(grp.refs.map(fetchVisits))).flat();
      const buckets = new Map<string, Departure>();
      for (const v of visits) {
        const j = v.MonitoredVehicleJourney;
        const iso = j.MonitoredCall.ExpectedDepartureTime ?? j.MonitoredCall.ExpectedArrivalTime ?? j.MonitoredCall.AimedDepartureTime;
        if (!iso) continue;
        const minutes = Math.round((new Date(iso).getTime() - now) / 60000);
        if (minutes < 0 || minutes > 90) continue;
        const info = lines.get(j.LineRef.value);
        const destination = j.DestinationName?.[0]?.value ?? "";
        const key = `${j.LineRef.value}|${destination}`;
        const b = buckets.get(key) ?? {
          line: info?.code ?? j.LineRef.value.split(":")[2],
          lineName: info?.name ?? "",
          tram: info?.tram ?? false,
          destination,
          minutes: [],
        };
        b.minutes.push(minutes);
        buckets.set(key, b);
      }
      const departures = [...buckets.values()]
        .map((d) => ({ ...d, minutes: d.minutes.sort((a, b) => a - b).slice(0, 3) }))
        .sort((a, b) => a.minutes[0] - b.minutes[0]);
      return { name: grp.name, distance: Math.round(grp.distance), departures };
    }),
  );
}

// ---------- vélos ----------

export type BikeStation = { name: string; distance: number; bikes: number; electric: number; docks: number; open: boolean };

export async function nearbyBikeStations(origin: LatLng, opts: { maxDistance?: number; max?: number } = {}): Promise<BikeStation[]> {
  const { maxDistance = 900, max = 4 } = opts;
  const [info, status] = await Promise.all([
    cached("gbfs-info", 3600e3, () =>
      getJson<{ data: { stations: { station_id: string; name: { text: string }[]; lat: number; lon: number }[] } }>(
        `${GBFS}/station_information.json?apiKey=${KEY}`,
      ),
    ),
    cached("gbfs-status", 45e3, () =>
      getJson<{ data: { stations: {
        station_id: string;
        is_renting: boolean;
        num_vehicles_available: number;
        num_docks_available: number;
        vehicle_types_available?: { count: number; vehicle_type_id: string }[];
      }[] } }>(`${GBFS}/station_status.json?apiKey=${KEY}`),
    ),
  ]);
  if (!info || !status) return [];
  const st = new Map(status.data.stations.map((s) => [s.station_id, s]));
  return info.data.stations
    .map((s) => ({ s, d: distanceM(origin, { lat: s.lat, lng: s.lon }) }))
    .filter((x) => x.d <= maxDistance && st.has(x.s.station_id))
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map(({ s, d }) => {
      const t = st.get(s.station_id)!;
      return {
        name: s.name[0]?.text ?? s.station_id,
        distance: Math.round(d),
        bikes: t.num_vehicles_available,
        electric: t.vehicle_types_available?.find((v) => v.vehicle_type_id === "electric")?.count ?? 0,
        docks: t.num_docks_available,
        open: t.is_renting,
      };
    });
}

// ---------- trajet domicile ↔ école ----------

export type Route = { minutes: number; km: number };

async function route(profile: "foot" | "bike", a: LatLng, b: LatLng): Promise<Route | null> {
  const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`;
  const data = await cached(`route:${profile}:${coords}`, 600e3, () =>
    getJson<{ routes?: { duration: number; distance: number }[] }>(
      `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${coords}?overview=false`,
    ),
  );
  const r = data?.routes?.[0];
  return r ? { minutes: Math.max(1, Math.round(r.duration / 60)), km: Math.round(r.distance / 100) / 10 } : null;
}

export async function tripEstimates(a: LatLng, b: LatLng) {
  const [foot, bike] = await Promise.all([route("foot", a, b), route("bike", a, b)]);
  const transitUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lng}&destination=${b.lat},${b.lng}&travelmode=transit`;
  return { foot, bike, transitUrl, straightKm: Math.round(distanceM(a, b) / 100) / 10 };
}
