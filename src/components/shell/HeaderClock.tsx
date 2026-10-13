"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

// Heure locale de l'appareil, affichée uniquement sur grand écran (PC) à côté du bouton de thème.
export function HeaderClock() {
  const [now, setNow] = useState<string | null>(null); // null le temps du premier rendu : évite un décalage serveur/client

  useEffect(() => {
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;
  return (
    <span className="hidden tabular-nums text-sm text-muted md:inline" aria-label={`Il est ${now}`}>{now}</span>
  );
}
