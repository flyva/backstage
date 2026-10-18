"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/stats-actions";

// Compte les visites par page (admin > Statistiques), sans rien afficher. Un appel par changement de page.
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageView(pathname).catch(() => {});
  }, [pathname]);
  return null;
}
