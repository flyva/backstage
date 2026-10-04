import Link from "next/link";
import { MapPin } from "lucide-react";
import { KIND_CLASS, KIND_LABEL } from "@/lib/alternance";
import type { WorkKind } from "@/db/schema";
import type { AgendaEvent } from "@/lib/ical";

// Planning de la semaine en grille horaire (une colonne par jour, une ligne par heure) : les cours sont placés selon leur heure.

// Hauteur de la grille : s'adapte à l'écran (l'agenda tient sans faire défiler la page), entre 420 et 860 px.
const GRID_HEIGHT = "clamp(420px, calc(100vh - 18.5rem), 860px)";
const MIN_EVENT_PX = 28;
/** Page du cours (notes) : les évènements de l'agenda viennent de la copie en base, leur identifiant est « c » + numéro. */
const courseHref = (id: string) => (/^cd+$/.test(id) ? `/cours/${id.slice(1)}` : null);
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const partsFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function minutesOfDay(d: Date) {
  const p = partsFmt.formatToParts(d);
  return Number(p.find((x) => x.type === "hour")?.value) * 60 + Number(p.find((x) => x.type === "minute")?.value);
}

type Placed = { e: AgendaEvent; s: number; en: number; lane: number; lanes: number };

/** Répartit les cours qui se chevauchent côte à côte dans la colonne du jour. */
function place(list: AgendaEvent[]): Placed[] {
  const items = list
    .map((e) => { const s = minutesOfDay(e.start); return { e, s, en: Math.max(minutesOfDay(e.end), s + 30), lane: 0, lanes: 1 }; })
    .sort((a, b) => a.s - b.s || a.en - b.en);
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];
  const flush = () => { const n = laneEnds.length || 1; cluster.forEach((c) => (c.lanes = n)); cluster = []; laneEnds.length = 0; };
  for (const it of items) {
    if (it.s >= clusterEnd) { flush(); clusterEnd = -1; }
    let lane = laneEnds.findIndex((end) => end <= it.s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.en); } else laneEnds[lane] = it.en;
    it.lane = lane;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.en);
  }
  flush();
  return items;
}

export function WeekGrid({ days, byDay, kinds, today, nowMinutes }: {
  days: { key: string; date: Date }[];
  byDay: Map<string, AgendaEvent[]>;
  kinds: Map<string, WorkKind>;
  today: string;
  nowMinutes: number;
}) {
  const timed = days.flatMap(({ key }) => (byDay.get(key) ?? []).filter((e) => !e.allDay));
  const first = timed.length ? Math.floor(Math.min(...timed.map((e) => minutesOfDay(e.start))) / 60) : 8;
  const last = timed.length ? Math.ceil(Math.max(...timed.map((e) => minutesOfDay(e.end))) / 60) : 18;
  const startH = Math.max(6, Math.min(first, 8));
  const endH = Math.min(23, Math.max(last, 18));
  const span = (endH - startH) * 60; // minutes affichées
  const pct = (minutes: number) => `${(minutes / span) * 100}%`;
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);

  // Le week-end reste étroit tant qu'il n'y a rien dedans.
  const cols = days.map(({ key }, i) => (i >= 5 && !(byDay.get(key)?.length) && !kinds.get(key) ? "0.45fr" : "1fr"));
  const template = `3rem ${cols.join(" ")}`;
  const anyAllDay = days.some(({ key }) => (byDay.get(key) ?? []).some((e) => e.allDay));

  return (
    <div className="card slim-scroll overflow-x-auto overflow-y-hidden p-0">
      <div className="min-w-[600px]">
        {/* En-têtes des jours */}
        <div className="grid border-b border-line bg-surface" style={{ gridTemplateColumns: template }}>
          <div />
          {days.map(({ key, date }) => {
            const kind = kinds.get(key);
            return (
              <div key={key} className={`border-l border-line px-2 py-2 text-center ${key === today ? "bg-accent/10" : ""}`}>
                <div className={`text-sm font-semibold capitalize ${key === today ? "text-accent" : ""}`}>{dayFmt.format(date)}</div>
                {kind && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_CLASS[kind]}`}>{KIND_LABEL[kind]}</span>}
              </div>
            );
          })}
        </div>

        {/* Évènements sur toute la journée */}
        {anyAllDay && (
          <div className="grid border-b border-line" style={{ gridTemplateColumns: template }}>
            <div className="px-1 py-1 text-right text-[10px] text-muted">Journée</div>
            {days.map(({ key }) => (
              <div key={key} className="space-y-1 border-l border-line p-1">
                {(byDay.get(key) ?? []).filter((e) => e.allDay).map((e) => (
                  <Link key={e.id} href={courseHref(e.id) ?? "/cours"} className="block truncate rounded-md border-l-4 border-accent bg-accent/15 px-2 py-1 text-xs font-medium hover:bg-accent/25" title={e.title}>{e.title}</Link>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Grille horaire */}
        <div className="grid" style={{ gridTemplateColumns: template }}>
          <div className="relative" style={{ height: GRID_HEIGHT }}>
            {hours.map((h) => (
              <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[11px] tabular-nums text-muted" style={{ top: pct((h - startH) * 60) }}>
                {h > startH ? `${h} h` : ""}
              </div>
            ))}
          </div>
          {days.map(({ key }) => {
            const placed = place((byDay.get(key) ?? []).filter((e) => !e.allDay));
            return (
              <div key={key} className={`relative border-l border-line ${key === today ? "bg-accent/5" : ""}`} style={{ height: GRID_HEIGHT }}>
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: pct((h - startH) * 60) }} />
                ))}
                {placed.map(({ e, s, en, lane, lanes }) => {
                  const long = en - s >= 90; // assez haut pour afficher aussi la salle
                  return (
                    <Link
                      key={e.id}
                      href={courseHref(e.id) ?? "/cours"}
                      className="absolute overflow-hidden rounded-lg border border-line border-l-4 border-l-accent bg-surface p-1.5 text-xs shadow-sm transition hover:border-accent hover:shadow-md"
                      style={{ top: pct(s - startH * 60), height: `calc(${pct(en - s)} - 2px)`, minHeight: MIN_EVENT_PX, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                      title={`${e.title}\n${timeFmt.format(e.start)} – ${timeFmt.format(e.end)}${e.location ? `\n${e.location}` : ""}`}
                    >
                      <div className="font-semibold leading-tight text-accent tabular-nums">{timeFmt.format(e.start)} – {timeFmt.format(e.end)}</div>
                      <div className="mt-0.5 text-[13px] font-medium leading-snug">{e.title}</div>
                      {e.location && long && <div className="mt-0.5 flex items-center gap-1 text-muted"><MapPin size={11} /> <span className="truncate">{e.location}</span></div>}
                    </Link>
                  );
                })}
                {key === today && nowMinutes >= startH * 60 && nowMinutes <= endH * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger" style={{ top: pct(nowMinutes - startH * 60) }}>
                    <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-danger" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
