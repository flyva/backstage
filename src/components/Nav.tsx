"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { GROUPS, type Badge, type Item } from "@/lib/nav-data";

// Une couleur par rubrique : casse le monochrome du menu, aide à repérer la section d'un coup d'œil.
const GROUP_COLOR: Record<string, string> = {
  quotidien: "#60a5fa",
  alternance: "#f59e0b",
  travail: "#34d399",
  savoirs: "#a78bfa",
  promo: "#f472b6",
  vie: "#fb923c",
  detente: "#22d3ee",
  ecole: "#94a3b8",
};

// Six groupes par thème, dépliés UN SEUL à la fois (accordéon) : le menu ne dépasse jamais la hauteur de l'écran, donc il ne défile pas.
// Le groupe de la page en cours est ouvert ; un clic sur un titre ouvre ce groupe (et referme l'autre).
// « / » et « /alternance » sont aussi le préfixe d'autres items (Planning a des pages sœurs comme /alternance/carnet) : correspondance exacte pour eux.
const isActive = (pathname: string, href: string) => (href === "/" || href === "/alternance" ? pathname === href : pathname.startsWith(href));
const itemActive = (pathname: string, i: Item): boolean => (i.href ? isActive(pathname, i.href) : false) || !!i.children?.some((c) => itemActive(pathname, c));
const itemVisible = (i: Item, isAdmin: boolean, views: Record<string, boolean>, hidden: Set<string>) =>
  (!i.adminOnly || isAdmin) && (!i.module || views[i.module]) && !(i.href && hidden.has(i.href));
const visibleChildren = (i: Item, isAdmin: boolean, views: Record<string, boolean>, hidden: Set<string>) => (i.children ?? []).filter((c) => itemVisible(c, isAdmin, views, hidden));

export function Nav({ isAdmin, loanBadge, views, hiddenPages }: { isAdmin: boolean; loanBadge: number; views: Record<string, boolean>; hiddenPages?: string[] }) {
  const hidden = new Set(hiddenPages ?? []); // déjà vide pour un·e administrateur·rice (voir permsOf)
  const pathname = usePathname();
  // Groupe ouvert : celui de la page en cours, sauf si la personne en a choisi un autre (ou tout refermé) sur cette page.
  // Changer de page revient au groupe de la nouvelle page. Même principe, un cran plus bas, pour un sous-dossier (ex. Cours).
  const [choice, setChoice] = useState<{ id: string | null; path: string } | null>(null);
  const [folderChoice, setFolderChoice] = useState<{ id: string | null; path: string } | null>(null);
  const activeId = GROUPS.find((g) => g.items.some((i) => itemActive(pathname, i)))?.id ?? GROUPS[0].id;
  const openId = choice && choice.path === pathname ? choice.id : activeId;
  const toggle = (id: string) => setChoice({ id: openId === id ? null : id, path: pathname });
  const toggleFolder = (id: string, hasActiveChild: boolean) => {
    const current = folderChoice && folderChoice.path === pathname ? folderChoice.id : hasActiveChild ? id : null;
    setFolderChoice({ id: current === id ? null : id, path: pathname });
  };
  const folderOpen = (id: string, hasActiveChild: boolean) => (folderChoice && folderChoice.path === pathname ? folderChoice.id === id : hasActiveChild);
  const countOf = (badge?: Badge) => (badge === "loans" ? loanBadge : 0);

  const renderLink = (i: Item, count: number, color: string) => {
    const active = i.href ? isActive(pathname, i.href) : false;
    return (
      <Link
        href={i.href!}
        aria-current={active ? "page" : undefined}
        style={active ? { background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, var(--accent)))`, boxShadow: `0 3px 10px -2px color-mix(in srgb, ${color} 65%, transparent)` } : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
          active ? "text-white" : "text-side-text hover:translate-x-0.5 hover:bg-side-hover hover:text-side-strong"
        }`}
      >
        <i.icon size={18} style={active ? undefined : { color }} className={active ? "" : "opacity-90"} />
        <span className="flex-1">{i.label}</span>
        {count > 0 && (
          <span className="rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold text-white" aria-label={`${count} à traiter`}>{count}</span>
        )}
      </Link>
    );
  };

  return (
    <nav className="space-y-0.5" aria-label="Navigation principale">
      {GROUPS.map((g) => {
        if (views[g.id] === false) return null; // section entière masquée pour ce rôle (Savoirs, Promo, Vie étudiante)
        const items = g.items.filter((i) => itemVisible(i, isAdmin, views, hidden));
        if (items.length === 0) return null;
        const open = openId === g.id;
        const pending = items.reduce((n, i) => n + countOf(i.badge), 0);
        const color = GROUP_COLOR[g.id] ?? "var(--accent)";
        return (
          <div key={g.id}>
            <button
              type="button"
              onClick={() => toggle(g.id)}
              aria-expanded={open}
              aria-controls={`nav-${g.id}`}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-side-muted transition hover:text-side-strong"
            >
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} aria-hidden />
              <ChevronRight size={13} className={`transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
              <span className="flex-1 text-left">{g.title}</span>
              {!open && pending > 0 && (
                <span className="rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold normal-case tracking-normal text-white" aria-label={`${pending} à traiter`}>{pending}</span>
              )}
            </button>
            {open && (
              <ul id={`nav-${g.id}`} className="mb-1.5 space-y-0.5">
                {items.map((i) => {
                  const count = countOf(i.badge);
                  if (i.children) {
                    const kids = visibleChildren(i, isAdmin, views, hidden);
                    if (kids.length === 0) return null;
                    const folderId = `${g.id}:${i.label}`;
                    const hasActiveChild = kids.some((c) => itemActive(pathname, c));
                    const fOpen = folderOpen(folderId, hasActiveChild);
                    return (
                      <li key={folderId}>
                        <button
                          type="button"
                          onClick={() => toggleFolder(folderId, hasActiveChild)}
                          aria-expanded={fOpen}
                          aria-controls={`nav-folder-${folderId}`}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-sm transition ${hasActiveChild && !fOpen ? "text-side-strong" : "text-side-text"} hover:bg-side-hover hover:text-side-strong`}
                        >
                          <i.icon size={18} style={{ color }} className="opacity-90" />
                          <span className="flex-1 text-left">{i.label}</span>
                          <ChevronRight size={14} className={`transition-transform ${fOpen ? "rotate-90" : ""}`} aria-hidden />
                        </button>
                        {fOpen && (
                          <ul id={`nav-folder-${folderId}`} className="ml-4 space-y-0.5 border-l-2 pl-2" style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}>
                            {kids.map((c) => <li key={c.href}>{renderLink(c, countOf(c.badge), color)}</li>)}
                          </ul>
                        )}
                      </li>
                    );
                  }
                  return <li key={i.href}>{renderLink(i, count, color)}</li>;
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
