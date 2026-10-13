"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Petit indicateur de chargement (le logo tourne en haut de l'écran) pendant qu'une page se charge : sans ça, un
 * clic sur un lien ne montre rien tant que la nouvelle page n'est pas prête, et on dirait que l'appli ne répond pas.
 * Repère une navigation au clic sur un lien interne, et la considère terminée dès que l'URL change.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigating = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // déjà sur cette page
      navigating.current = true;
      // Petit délai : pas de clignotement pour les navigations quasi instantanées (page déjà en cache côté client).
      showTimer.current = setTimeout(() => { if (navigating.current) setVisible(true); }, 150);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // L'URL a changé : la nouvelle page s'est résolue, on arrête.
  useEffect(() => {
    if (!navigating.current) return;
    navigating.current = false;
    if (showTimer.current) clearTimeout(showTimer.current);
    setVisible(false);
  }, [pathname, searchParams]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center print:hidden" aria-hidden>
      <div className="anim-route-in flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-1.5 shadow-lg backdrop-blur">
        <span className="route-logo grid size-6 place-items-center rounded-lg bg-accent text-[10px] font-extrabold tracking-tight text-accent-fg">3IS</span>
        <span className="text-xs text-muted">Chargement…</span>
      </div>
    </div>
  );
}
