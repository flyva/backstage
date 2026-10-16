"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, User } from "lucide-react";
import { AssistantFab } from "@/components/AssistantFab";

type Person = { id: number; name: string; avatar: string | null; email3is: string | null; phone: string | null };

// Coquille de l'application : menu de gauche (tiroir sur mobile), barre du haut (recherche, cloche, paramètres) et contenu.
export function AppShell({ sidebar, messages, bell, menu, children }: { sidebar: ReactNode; messages: ReactNode; bell: ReactNode; menu: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<string | null>(null); // menu mobile ouvert pour cette page (se ferme tout seul à la navigation)
  const menuOpen = menuFor === pathname;
  const search = useRef<HTMLInputElement>(null);

  // Autocomplétion de l'annuaire : on interroge le serveur 200 ms après la dernière frappe (pas à chaque touche).
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const query = q.trim();
    const id = ++requestId.current;
    if (query.length < 2) {
      const clear = setTimeout(() => { if (id === requestId.current) setPeople(null); }, 0);
      return () => clearTimeout(clear);
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/annuaire/search?q=${encodeURIComponent(query)}`);
        if (id !== requestId.current) return; // une saisie plus récente a déjà relancé une requête
        if (!res.ok) { setPeople([]); return; }
        const data = (await res.json()) as { people?: Person[] };
        setPeople(data.people ?? []);
      } catch {
        if (id === requestId.current) setPeople([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  // Ctrl/Cmd + K : focus sur la recherche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goToPerson = (p: Person) => {
    setOpen(false);
    setQ("");
    router.push(`/annuaire/${p.id}`);
  };
  const goToSearch = () => {
    const query = q.trim();
    if (query) { setOpen(false); router.push(`/recherche?q=${encodeURIComponent(query)}`); }
  };

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
            onSubmit={(e) => { e.preventDefault(); if (open && people?.[active]) goToPerson(people[active]); else goToSearch(); }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
          >
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={search}
              name="q"
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (!people || people.length === 0) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % people.length); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? people.length - 1 : a - 1)); }
                else if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Rechercher…"
              aria-label="Rechercher dans Backstage"
              autoComplete="off"
              role="combobox"
              aria-expanded={open && !!people?.length}
              aria-autocomplete="list"
              aria-controls="search-annuaire-listbox"
              className="input h-9 pl-9 pr-14"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1 text-[10px] text-muted sm:block">Ctrl K</kbd>

            {open && q.trim().length >= 2 && people && people.length > 0 && (
              <ul id="search-annuaire-listbox" role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
                <li className="border-b border-line px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Annuaire</li>
                {people.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToPerson(p)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${i === active ? "bg-accent/15" : ""}`}
                    >
                      {p.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-muted"><User size={14} /></span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted">{[p.email3is, p.phone].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-line">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={goToSearch} className="block w-full px-3 py-2 text-left text-xs text-muted hover:text-fg">
                    Voir tous les résultats pour « {q.trim()} » →
                  </button>
                </li>
              </ul>
            )}
          </form>
          {messages}
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
