"use client";

import { useEffect } from "react";
import { pingOnline } from "@/lib/presence-actions";

// Ping régulier pour le statut "en ligne" (annuaire, messages) : ne s'affiche rien, juste un signal de présence.
export function OnlinePing() {
  useEffect(() => {
    const ping = () => { pingOnline().catch(() => {}); };
    ping();
    const id = setInterval(ping, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  return null;
}
