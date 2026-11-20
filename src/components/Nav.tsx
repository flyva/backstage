"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Shield } from "lucide-react";
import { GROUPS, type Badge, type Item } from "@/lib/nav-data";

// Six groupes par thème, dépliés UN SEUL à la fois (accordéon) : le menu ne dépasse jamais la hauteur de l'écran, donc il ne défile pas.
// Le groupe de la page en cours est ouvert ; un clic sur un titre ouvre ce groupe (et referme l'autre).
// « / » et « /alternance » sont aussi le préfixe d'autres items (Planning a des pages sœurs comme /alternance/carnet) : correspondance exacte pour eux.
const EXACT_ONLY = new Set(["/", "/alternance", "/recherche-entreprises"]);
const isActive = (pathname: string, href: string) => (EXACT_ONLY.has(href) ? pathname === href : pathname.startsWith(href));
const itemActive = (pathname: string, i: Item): boolean => (i.href ? isActive(pathname, i.href) : false) || !!i.children?.some((c) => itemActive(pathname, c));
const itemVisible = (i: Item, isAdmin: boolean, views: Record<string, boolean>, hidden: Set<string>) =>
  (!i.adminOnly || isAdmin) && (!i.module || views[i.module]) && !(i.href && hidden.has(i.href));
const visibleChildren = (i: Item, isAdmin: boolean, views: Record<string, boolean>, hidden: Set<string>) => (i.children ?? []).filter((c) => itemVisible(c, isAdmin, views, hidden));
// Un dossier (ex. « Cours », « Recherche entreprises ») n'a pas de `module` propre : `itemVisible` seul le laisse
// toujours passer, même quand tous ses enfants sont masqués (role sans aucune page de Cours, par ex.). Sans ce
// garde-fou, un groupe (ex. « Travail ») pouvait rester affiché — vide, rien à déplier — pour ce seul dossier fantôme.
const itemRendersSomething = (i: Item, isAdmin: boolean, views: Record<string, boolean>, hidden: Set<string>) =>
  itemVisible(i, isAdmin, views, hidden) && (!i.children || visibleChildren(i, isAdmin, views, hidden).length > 0);

// Couleur d'icône des liens du menu : reprise telle quelle de BDE (gris fixe, pas la teinte du thème).
const ICON_GRAY = "#8891a0";

export function Nav({ isAdmin, loanBadge, views, hiddenPages, isAlternant = true }: { isAdmin: boolean; loanBadge: number; views: Record<string, boolean>; hiddenPages?: string[]; isAlternant?: boolean }) {
  const hidden = new Set(hiddenPages ?? []); // déjà vide pour un·e administrateur·rice (voir permsOf)
  const pathname = usePathname();
  // Groupe ouvert : celui de la page en cours, sauf si la personne en a choisi un autre (ou tout refermé) sur cette page.
  // Changer de page revient au groupe de la nouvelle page. Même principe, un cran plus bas, pour un sous-dossier (ex. Cours).
  const [choice, setChoice] = useState<{ id: string | null; path: string } | null>(null);
  const [folderChoice, setFolderChoice] = useState<{ id: string | null; path: string } | null>(null);
  // « Au quotidien » (Accueil, Agenda, Mobilité) n'est pas un accordéon : ses liens sont toujours visibles, épinglés en haut, comme les liens épinglés de BDE.
  const pinned = GROUPS.find((g) => g.id === "quotidien");
  // Titre « Alternance »/« Stage » selon le statut (voir Profil > Alternance) — même bascule que chez BDE.
  const accordionGroups = GROUPS.filter((g) => g.id !== "quotidien").map((g) => (g.id === "alternance" && !isAlternant ? { ...g, title: "Stage" } : g));
  const activeId = accordionGroups.find((g) => g.items.some((i) => itemActive(pathname, i)))?.id ?? accordionGroups[0].id;
  const openId = choice && choice.path === pathname ? choice.id : activeId;
  const toggle = (id: string) => setChoice({ id: openId === id ? null : id, path: pathname });
  const toggleFolder = (id: string, hasActiveChild: boolean) => {
    const current = folderChoice && folderChoice.path === pathname ? folderChoice.id : hasActiveChild ? id : null;
    setFolderChoice({ id: current === id ? null : id, path: pathname });
  };
  const folderOpen = (id: string, hasActiveChild: boolean) => (folderChoice && folderChoice.path === pathname ? folderChoice.id === id : hasActiveChild);
  const countOf = (badge?: Badge) => (badge === "loans" ? loanBadge : 0);

  // Lien épinglé (hors catégorie) : padding 5px 10px, icône 15px — identique aux liens épinglés de BDE (Agenda, Mobilité…).
  const renderPinned = (i: Item, count: number) => {
    const active = i.href ? isActive(pathname, i.href) : false;
    return (
      <Link
        href={i.href!}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[5px] text-[13px] transition ${
          active ? "bg-side-hover font-semibold text-side-strong" : "text-side-text hover:bg-side-hover hover:text-side-strong"
        }`}
      >
        <i.icon size={15} className="shrink-0" style={{ color: active ? undefined : ICON_GRAY }} />
        <span className="flex-1">{i.label}</span>
        {count > 0 && (
          <span className="rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold text-white" aria-label={`${count} à traiter`}>{count}</span>
        )}
      </Link>
    );
  };

  // Lien d'une catégorie (dépliée) : padding 3px 10px 3px 24px, icône 13px — identique aux items de catégorie de BDE.
  const renderLink = (i: Item, count: number) => {
    const active = i.href ? isActive(pathname, i.href) : false;
    return (
      <Link
        href={i.href!}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 rounded-lg py-[3px] pl-6 pr-2.5 text-[13px] transition ${
          active ? "bg-side-hover font-semibold text-side-strong" : "text-side-text hover:bg-side-hover hover:text-side-strong"
        }`}
      >
        <i.icon size={13} className="shrink-0" style={{ color: active ? undefined : ICON_GRAY }} />
        <span className="flex-1">{i.label}</span>
        {count > 0 && (
          <span className="rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold text-white" aria-label={`${count} à traiter`}>{count}</span>
        )}
      </Link>
    );
  };

  return (
    <nav className="space-y-0.5" aria-label="Navigation principale">
      {pinned && (
        <div className="mb-2 space-y-0.5 border-b border-side-line pb-2">
          {pinned.items.filter((i) => itemRendersSomething(i, isAdmin, views, hidden)).map((i) => (
            <div key={i.href}>{renderPinned(i, countOf(i.badge))}</div>
          ))}
        </div>
      )}
      {accordionGroups.map((g) => {
        if (views[g.id] === false) return null; // section entière masquée pour ce rôle (Savoirs, Promo, Vie étudiante)
        const items = g.items.filter((i) => itemRendersSomething(i, isAdmin, views, hidden));
        if (items.length === 0) return null; // ex. « Travail » sans aucune page de Cours ni rien d'autre d'activé
        const open = openId === g.id;
        const pending = items.reduce((n, i) => n + countOf(i.badge), 0);
        return (
          <div key={g.id}>
            <button
              type="button"
              onClick={() => toggle(g.id)}
              aria-expanded={open}
              aria-controls={`nav-${g.id}`}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-side-muted transition"
            >
              <span className="flex-1 text-left">{g.title}</span>
              {!open && pending > 0 && (
                <span className="rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold normal-case tracking-normal text-white" aria-label={`${pending} à traiter`}>{pending}</span>
              )}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            {open && (
              <ul id={`nav-${g.id}`} className="space-y-0.5">
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
                          className="flex w-full items-center gap-2 rounded-lg py-[3px] pl-6 pr-2.5 text-[13.5px] text-side-text"
                        >
                          <i.icon size={13} className="shrink-0" style={{ color: ICON_GRAY }} />
                          <span className="flex-1 text-left">{i.label}</span>
                          <span className={`text-xs transition-transform ${fOpen ? "rotate-90" : ""}`} aria-hidden>›</span>
                        </button>
                        {fOpen && (
                          <ul id={`nav-folder-${folderId}`} className="space-y-0.5">
                            {kids.map((c) => {
                              const cActive = isActive(pathname, c.href!);
                              return (
                                <li key={c.href}>
                                  <Link
                                    href={c.href!}
                                    aria-current={cActive ? "page" : undefined}
                                    className={`flex items-center gap-2 rounded-lg py-[3px] pl-[38px] pr-2.5 text-[13px] transition ${
                                      cActive ? "bg-side-hover font-semibold text-side-strong" : "text-side-text hover:bg-side-hover hover:text-side-strong"
                                    }`}
                                  >
                                    {c.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }
                  return <li key={i.href}>{renderLink(i, count)}</li>;
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Placé hors du menu déroulant, juste au-dessus du profil — même emplacement que le lien Administration de BDE.
export function AdminLink() {
  const pathname = usePathname();
  const active = isActive(pathname, "/admin");
  return (
    <Link
      href="/admin"
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] transition ${
        active ? "bg-side-hover text-side-strong" : "text-side-muted hover:bg-side-hover hover:text-side-strong"
      }`}
    >
      <Shield size={13} className="shrink-0" />
      Administration
    </Link>
  );
}
