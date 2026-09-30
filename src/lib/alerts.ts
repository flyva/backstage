import "server-only";
import { KEY, SIRI, cached, distanceM, getJson, getLines, getStopPoints, type LatLng } from "@/lib/mobility";

// Alertes TBM : messages généraux du SIRI Lite de Bordeaux Métropole (travaux, déviations, lignes perturbées, informations).

type RawMessage = {
  InfoChannelRef?: { value: string };
  ValidUntilTime?: string;
  Content?: { LineRef?: { value: string }[]; Message?: { MessageType: string; MessageText: { value: string } }[] };
};
type RawGm = { Siri?: { ServiceDelivery?: { GeneralMessageDelivery?: { GeneralMessage?: RawMessage[] }[] } } };

export type TbmAlert = {
  kind: "perturbation" | "information";
  title: string;
  detail: string;
  until: Date | null;
  lines: string[]; // références de lignes (bordeaux:Line:07:LOC)
};

export async function getAlerts(): Promise<TbmAlert[]> {
  const list = await cached("alerts", 5 * 60e3, async () => {
    const j = await getJson<RawGm>(`${SIRI}/general-message.json?AccountKey=${KEY}`);
    const raw = j.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.GeneralMessage ?? [];
    return raw.map((m): TbmAlert => {
      const text = (type: string) => m.Content?.Message?.find((x) => x.MessageType === type)?.MessageText.value?.trim() ?? "";
      return {
        kind: m.InfoChannelRef?.value === "Information" ? "information" : "perturbation",
        title: text("shortMessage") || text("longMessage").split("\n")[0] || "Message TBM",
        detail: text("longMessage"),
        until: m.ValidUntilTime ? new Date(m.ValidUntilTime) : null,
        lines: (m.Content?.LineRef ?? []).map((l) => l.value),
      };
    });
  });
  const now = Date.now();
  return (list ?? []).filter((a) => !a.until || a.until.getTime() > now);
}

/** Références des lignes qui desservent un arrêt à moins de `radius` mètres de l'un des points. */
export async function linesNear(points: LatLng[], radius = 600): Promise<Set<string>> {
  const stops = await getStopPoints();
  const out = new Set<string>();
  for (const s of stops) if (points.some((p) => distanceM(p, s) <= radius)) for (const l of s.lines) out.add(l);
  return out;
}

export type PlaceAlert = TbmAlert & { codes: string[] };

/** Alertes qui touchent les lignes des arrêts proches de ces points, les plus urgentes (fin la plus proche) d'abord. */
export async function alertsNear(points: LatLng[]): Promise<PlaceAlert[]> {
  if (points.length === 0) return [];
  const [alerts, near, info] = await Promise.all([getAlerts().catch(() => []), linesNear(points, 400).catch(() => new Set<string>()), getLines().catch(() => new Map())]);
  return alerts
    .filter((a) => a.lines.some((l) => near.has(l)))
    .map((a) => ({ ...a, codes: a.lines.filter((l) => near.has(l)).map((l) => info.get(l)?.code ?? l.split(":")[2]) }))
    .sort((x, y) => (x.kind === y.kind ? (x.until?.getTime() ?? Infinity) - (y.until?.getTime() ?? Infinity) : x.kind === "perturbation" ? -1 : 1));
}

/** Alertes qui touchent l'une de ces lignes (par leur code : « 24 », « B », « 952 »…), par exemple celles d'un trajet. */
export async function alertsForCodes(codes: string[]): Promise<PlaceAlert[]> {
  if (codes.length === 0) return [];
  const [alerts, info] = await Promise.all([getAlerts().catch(() => []), getLines().catch(() => new Map())]);
  const refs = new Set([...info.entries()].filter(([, l]) => codes.includes(l.code)).map(([ref]) => ref));
  return alerts
    .filter((a) => a.lines.some((l) => refs.has(l)))
    .map((a) => ({ ...a, codes: a.lines.filter((l) => refs.has(l)).map((l) => info.get(l)?.code ?? l.split(":")[2]) }))
    .sort((x, y) => (x.kind === y.kind ? (x.until?.getTime() ?? Infinity) - (y.until?.getTime() ?? Infinity) : x.kind === "perturbation" ? -1 : 1));
}
