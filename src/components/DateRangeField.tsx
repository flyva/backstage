"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { addDays, addMonths, dayLabel, monthGrid, monthLabel } from "@/lib/alternance";

const WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Un seul champ pour choisir un jour, ou une période (du jour au jour), avec les jours mis en couleur comme un
 * sélecteur de dates de voyage. Pose deux champs cachés (day / endDay) pour le formulaire. maxSpanDays limite l'écart
 * entre day et endDay (ex. 1 pour une ligne de pointeuse qui passe minuit) ; sans limite par défaut (période libre).
 */
export function DateRangeField({
  today, day: initialDay, endDay: initialEndDay, dayName = "day", endDayName = "endDay", id, maxSpanDays, hint,
}: {
  today: string; day?: string; endDay?: string; dayName?: string; endDayName?: string; id?: string; maxSpanDays?: number; hint?: string;
}) {
  const [day, setDay] = useState(initialDay ?? today);
  const [endDay, setEndDay] = useState(initialEndDay ?? initialDay ?? today);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((initialDay ?? today).slice(0, 7));

  const pick = (d: string) => {
    if (d > today) return; // jamais dans le futur
    if (endDay === day) {
      // un seul jour choisi pour l'instant : ce clic étend la période (si autorisé), ou en commence une nouvelle.
      if (d > day && (maxSpanDays == null || d <= addDays(day, maxSpanDays))) { setEndDay(d); return; }
      if (d === day) return;
    }
    setDay(d); setEndDay(d); // nouvelle sélection simple sur ce jour
  };

  const label = day === endDay ? dayLabel(day) : `${dayLabel(day)} → ${dayLabel(endDay)}`;

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <input type="hidden" name={dayName} value={day} />
      <input type="hidden" name={endDayName} value={endDay} />
      <button type="button" id={id} onClick={() => setOpen((o) => !o)} className="input flex w-full items-center gap-2 text-left capitalize">
        <CalendarDays size={16} className="shrink-0 text-muted" aria-hidden />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-72 rounded-xl border border-line bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="btn-ghost px-2 text-xs" aria-label="Mois précédent">←</button>
            <span className="text-sm font-medium capitalize">{monthLabel(month)}</span>
            <button type="button" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= today.slice(0, 7)} className="btn-ghost px-2 text-xs disabled:opacity-30" aria-label="Mois suivant">→</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted">{WEEK.map((w) => <div key={w}>{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-0.5">
            {monthGrid(month).map(({ day: d, inMonth }) => {
              const future = d > today;
              const inRange = d >= day && d <= endDay;
              const edge = d === day || d === endDay;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={future}
                  onClick={() => pick(d)}
                  className={`flex h-8 items-center justify-center rounded-md text-xs tabular-nums transition ${!inMonth ? "opacity-30" : ""} ${future ? "cursor-not-allowed opacity-20" : ""} ${edge ? "bg-accent font-semibold text-accent-fg" : inRange ? "bg-accent/20" : "hover:bg-bg"}`}
                >
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted">{hint ?? "Clique un jour, puis un autre jour pour une période."}</p>
          <button type="button" onClick={() => setOpen(false)} className="btn mt-1 w-full text-xs">OK</button>
        </div>
      )}
    </div>
  );
}
