"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, PanelRight, Search, X } from "lucide-react";
import { QuickTheme } from "@/components/shell/SkinControls";
import type { Accent, SidebarSkin, ThemeMode } from "@/lib/skin";

// État du panneau de droite mémorisé dans le navigateur : "1" ouvert, "0" fermé, absent = automatique (ouvert sur grand écran).
const KEY = "backstage:right-panel";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
};
const read = () => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } };
const write = (v: "0" | "1") => { try { localStorage.setItem(KEY, v); } catch { /* stockage indisponible */ } listeners.forEach((l) => l()); };

export function AppShell({ sidebar, panel, skin, children }: { sidebar: ReactNode; panel: ReactNode; skin: { theme: ThemeMode; accent: Accent; sidebar: SidebarSkin }; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<string | null>(null); // menu mobile ouvert pour cette page (se ferme tout seul à la navigation)
  const menuOpen = menuFor === pathname;
  const stored = useSyncExternalStore(subscribe, read, () => "");
  const search = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd + K : focus sur la recherche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const panelClass = stored === "1" ? "block" : stored === "0" ? "hidden" : "hidden xl:block";
  const panelVisible = stored === "1";

  return (
    <div className="flex min-h-screen bg-bg text-fg print:block">
      {/* Menu de gauche : tiroir sur mobile, fixe sur ordinateur */}
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden print:hidden" onClick={() => setMenuFor(null)} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-side transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 print:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Menu principal"
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur print:hidden">
          <button className="rounded-lg p-1.5 text-muted hover:text-fg md:hidden" onClick={() => setMenuFor(pathname)} aria-label="Ouvrir le menu">
            <Menu size={20} />
          </button>
          <form
            role="search"
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              if (typeof q === "string" && q.trim()) router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input ref={search} name="q" type="search" placeholder="Rechercher…" aria-label="Rechercher dans Backstage" className="input h-9 pl-9 pr-14" />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1 text-[10px] text-muted sm:block">Ctrl K</kbd>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <QuickTheme initial={skin} />
            <button
              onClick={() => write(panelVisible || (stored === "" && typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches) ? "0" : "1")}
              className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg"
              aria-label="Afficher ou masquer le panneau de personnalisation"
              title="Personnalisation, raccourcis, activité"
            >
              <PanelRight size={16} />
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6 print:p-0">{children}</main>
      </div>

      {/* Panneau de droite (personnalisation, raccourcis, activité) */}
      <aside
        className={`${panelClass} fixed inset-y-0 right-0 z-40 w-72 shrink-0 overflow-y-auto border-l border-line bg-surface p-4 xl:sticky xl:top-0 xl:z-auto xl:h-screen print:hidden`}
        aria-label="Panneau de droite"
      >
        <button className="mb-2 ml-auto flex rounded-lg p-1 text-muted hover:text-fg xl:hidden" onClick={() => write("0")} aria-label="Fermer le panneau"><X size={18} /></button>
        {panel}
      </aside>
    </div>
  );
}
