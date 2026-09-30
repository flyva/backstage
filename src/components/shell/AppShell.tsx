"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { AssistantFab } from "@/components/AssistantFab";

// Coquille de l'application : menu de gauche (tiroir sur mobile), barre du haut (recherche, cloche, paramètres) et contenu.
export function AppShell({ sidebar, bell, menu, children }: { sidebar: ReactNode; bell: ReactNode; menu: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<string | null>(null); // menu mobile ouvert pour cette page (se ferme tout seul à la navigation)
  const menuOpen = menuFor === pathname;
  const search = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd + K : focus sur la recherche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-bg text-fg print:block">
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
            {bell}
            {menu}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6 print:p-0">{children}</main>
      </div>
      <AssistantFab />
    </div>
  );
}
