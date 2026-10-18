"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtFull = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmtDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

// Heure locale de l'appareil, affichée uniquement sur grand écran (PC) à côté du bouton de thème.
// Cliquer l'ouvre en plein écran (blanc sur noir, avec les secondes) : pratique pour la régie / le Jour J.
export function HeaderClock() {
  const [now, setNow] = useState<string | null>(null); // null le temps du premier rendu : évite un décalage serveur/client
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (!now) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setFullscreen(true)}
        className="hidden tabular-nums text-sm text-muted hover:text-fg md:inline"
        aria-label={`Il est ${now}, cliquer pour l'afficher en plein écran`}
      >
        {now}
      </button>
      {fullscreen && createPortal(<FullscreenClock onClose={() => setFullscreen(false)} />, document.body)}
    </>
  );
}

function FullscreenClock({ onClose }: { onClose: () => void }) {
  const [time, setTime] = useState(fmtFull.format(new Date()));
  const [date, setDate] = useState(fmtDate.format(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setTime(fmtFull.format(d));
      setDate(fmtDate.format(d));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black text-white"
      onClick={onClose}
      role="button"
      tabIndex={0}
      aria-label="Fermer l'horloge plein écran"
    >
      <p className="text-3xl capitalize text-white/70">{date}</p>
      <p className="font-mono text-[18vw] font-bold leading-none tabular-nums md:text-[14rem]">{time}</p>
      <p className="text-sm text-white/50">Cliquer ou Échap pour fermer</p>
    </div>
  );
}
