import "server-only";
import { nearbyBikeStations, nearbyStops, type BikeStation, type StopResult } from "@/lib/mobility";

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]).catch(() => null);

/**
 * Coup d'œil de l'accueil autour du domicile : arrêts proches et stations de vélos.
 * Chaque appel est plafonné à 2,5 s : si TBM ou Le Vélo est lent, l'accueil s'affiche quand même (sans ces cartes).
 */
export async function homeGlance(origin: { lat: number; lng: number } | null): Promise<{ stops: StopResult[]; bikes: BikeStation[] }> {
  if (!origin) return { stops: [], bikes: [] };
  const [stops, bikes] = await Promise.all([
    withTimeout(nearbyStops(origin, { maxStops: 2 }), 2500),
    withTimeout(nearbyBikeStations(origin, { max: 1 }), 2500),
  ]);
  return { stops: stops ?? [], bikes: bikes ?? [] };
}
