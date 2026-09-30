import "server-only";
import { cached, getJson, type LatLng } from "@/lib/mobility";

// Météo du jour : Open-Meteo (gratuit, sans clé ni inscription). Données mises en cache 30 minutes par zone (~1 km).

const BORDEAUX: LatLng = { lat: 44.8378, lng: -0.5792 };

type OpenMeteo = {
  current?: { temperature_2m: number; weather_code: number; is_day: number };
  hourly?: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; weather_code: number[] };
};

export type Weather = {
  temp: number; // température actuelle
  code: number;
  label: string;
  icon: "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm" | "moon";
  min: number; // minimum et maximum de la journée (de 7 h à 21 h)
  max: number;
  rainMax: number; // probabilité de pluie maximale d'ici la fin de journée (%)
  rainFrom: string | null; // première heure de risque de pluie (« 14 h »)
  advice: string | null;
};

// Codes météo WMO → libellé et pictogramme.
function describe(code: number, isDay: boolean): Pick<Weather, "label" | "icon"> {
  if (code === 0) return isDay ? { label: "Ciel dégagé", icon: "sun" } : { label: "Nuit claire", icon: "moon" };
  if (code <= 2) return { label: "Éclaircies", icon: "cloud-sun" };
  if (code === 3) return { label: "Couvert", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Brouillard", icon: "fog" };
  if (code >= 51 && code <= 57) return { label: "Bruine", icon: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: code >= 80 ? "Averses" : "Pluie", icon: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Neige", icon: "snow" };
  if (code >= 95) return { label: "Orage", icon: "storm" };
  return { label: "Variable", icon: "cloud" };
}

const parisHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(d));
const parisDay = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(d); // AAAA-MM-JJ

export async function getWeather(at: LatLng | null): Promise<Weather | null> {
  const p = at ?? BORDEAUX;
  const lat = p.lat.toFixed(2);
  const lng = p.lng.toFixed(2);
  const data = await cached(`weather:${lat},${lng}`, 30 * 60e3, () =>
    getJson<OpenMeteo>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FParis&forecast_days=1`,
    ),
  );
  if (!data?.current || !data.hourly) return null;

  const now = new Date();
  const today = parisDay(now);
  const from = Math.max(parisHour(now), 7);
  const hours = data.hourly.time
    .map((t, i) => ({ day: t.slice(0, 10), h: Number(t.slice(11, 13)), temp: data.hourly!.temperature_2m[i], rain: data.hourly!.precipitation_probability[i] ?? 0 }))
    .filter((x) => x.day === today && x.h >= 7 && x.h <= 21);
  // Le conseil « parapluie » ne porte que sur la journée (jusqu'à 20 h) : une averse à 22 h ne change rien.
  const ahead = hours.filter((x) => x.h >= from && x.h <= 20);
  const temps = hours.map((x) => x.temp);
  const rainMax = ahead.length ? Math.max(...ahead.map((x) => x.rain)) : 0;
  const risky = ahead.find((x) => x.rain >= 50);

  const temp = Math.round(data.current.temperature_2m);
  const min = temps.length ? Math.round(Math.min(...temps)) : temp;
  const max = temps.length ? Math.round(Math.max(...temps)) : temp;
  let advice: string | null = null;
  if (risky) advice = `Pluie probable dès ${risky.h} h (${rainMax} %) : prends un parapluie.`;
  else if (max >= 30) advice = "Forte chaleur : pense à t'hydrater.";
  else if (min <= 3) advice = "Il fait très froid : couvre-toi bien.";
  return { temp, code: data.current.weather_code, ...describe(data.current.weather_code, data.current.is_day === 1), min, max, rainMax, rainFrom: risky ? `${risky.h} h` : null, advice };
}
