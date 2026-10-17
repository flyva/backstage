"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, BookUser, Bot, Briefcase, Calculator, Car, ChevronRight, CalendarDays, Camera, CircleHelp, Clock, Cog, Home, Images, Lightbulb, Link2, Network, Newspaper, PartyPopper, School, NotebookPen, ShieldCheck, SquareKanban, TramFront, Users, Contact, Megaphone, CalendarClock, Zap, BarChart3,
  type LucideIcon,
} from "lucide-react";

type Badge = "loans";
type Item = { href?: string; label: string; icon: LucideIcon; badge?: Badge; adminOnly?: boolean; module?: string; children?: Item[] };
type Group = { id: string; title: string; items: Item[] };

// Six groupes par thème, dépliés UN SEUL à la fois (accordéon) : le menu ne dépasse jamais la hauteur de l'écran, donc il ne défile pas.
// Le groupe de la page en cours est ouvert ; un clic sur un titre ouvre ce groupe (et referme l'autre).
const GROUPS: Group[] = [
  {
    id: "quotidien", title: "Au quotidien",
    items: [
      { href: "/", label: "Accueil", icon: Home },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/mobilite", label: "Mobilité", icon: TramFront },
    ],
  },
  {
    id: "alternance", title: "Alternance",
    items: [
      { href: "/alternance", label: "Planning", icon: CalendarDays },
      { href: "/alternance/carnet", label: "Carnet de compétences", icon: NotebookPen },
      { href: "/alternance/pointeuse", label: "Pointeuse", icon: Clock },
      { href: "/alternance/stats", label: "Statistiques", icon: BarChart3 },
    ],
  },
  {
    id: "travail", title: "Travail",
    items: [
      { href: "/projets", label: "Projets", icon: Briefcase },
      { href: "/kanban", label: "Mon kanban", icon: SquareKanban },
      { href: "/reseau", label: "Carnet de réseau", icon: Contact },
      { href: "/calculettes", label: "Calculettes", icon: Calculator },
      {
        label: "Cours", icon: NotebookPen,
        children: [
          { href: "/cours", label: "Mes cours", icon: NotebookPen, module: "cours" },
          { href: "/habilitation", label: "Habilitation électrique", icon: ShieldCheck, module: "habilitation" },
          { href: "/cours/lecon/reseaux", label: "Réseaux", icon: Network, module: "reseaux" },
          { href: "/cours/lecon/mecanique", label: "Mécanique", icon: Cog, module: "mecanique" },
          { href: "/cours/lecon/electricite", label: "Électricité", icon: Zap, module: "electricite" },
          { href: "/cours/lecon/lumiere", label: "Lumière", icon: Lightbulb, module: "lumiere" },
        ],
      },
    ],
  },
  {
    id: "savoirs", title: "Savoirs",
    items: [
      { href: "/wiki", label: "Wiki", icon: BookOpen },
      { href: "/assistant", label: "Assistant", icon: Bot },
      { href: "/faq", label: "FAQ", icon: CircleHelp },
    ],
  },
  {
    id: "promo", title: "Promo",
    items: [
      { href: "/actus", label: "Actualités", icon: Newspaper, module: "actus" },
      { href: "/annuaire", label: "Annuaire", icon: Users },
      { href: "/annonces", label: "Annonces", icon: Megaphone },
      { href: "/disponibilites", label: "Disponibilités", icon: CalendarClock },
      { href: "/covoiturage", label: "Covoiturage", icon: Car },
    ],
  },
  {
    id: "vie", title: "Vie étudiante",
    items: [
      { href: "/bde", label: "BDE", icon: PartyPopper, module: "bde" },
      { href: "/galerie", label: "Galerie", icon: Images, module: "galerie" },
      { href: "/instagram", label: "Instagram", icon: Camera },
    ],
  },
  {
    id: "ecole", title: "École",
    items: [
      { href: "/ecole", label: "Wi-Fi et plan", icon: School },
      { href: "/contacts", label: "Contacts", icon: BookUser },
      { href: "/liens", label: "Liens utiles", icon: Link2 },
    ],
  },
];

// « / » et « /alternance » sont aussi le préfixe d'autres items (Planning a des pages sœurs comme /alternance/carnet) : correspondance exacte pour eux.
const isActive = (pathname: string, href: string) => (href === "/" || href === "/alternance" ? pathname === href : pathname.startsWith(href));
const itemActive = (pathname: string, i: Item): boolean => (i.href ? isActive(pathname, i.href) : false) || !!i.children?.some((c) => itemActive(pathname, c));
const visibleChildren = (i: Item, isAdmin: boolean, views: Record<string, boolean>) => (i.children ?? []).filter((c) => (!c.adminOnly || isAdmin) && (!c.module || views[c.module]));

export function Nav({ isAdmin, loanBadge, views }: { isAdmin: boolean; loanBadge: number; views: Record<string, boolean> }) {
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

  const renderLink = (i: Item, count: number) => {
    const active = i.href ? isActive(pathname, i.href) : false;
    return (
      <Link
        href={i.href!}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm transition ${
          active ? "bg-accent text-accent-fg shadow-[0_2px_8px_color-mix(in_srgb,var(--accent)_40%,transparent)]" : "text-side-text hover:bg-side-hover hover:text-side-strong"
        }`}
      >
        <i.icon size={18} />
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
        const items = g.items.filter((i) => (!i.adminOnly || isAdmin) && (!i.module || views[i.module]));
        if (items.length === 0) return null;
        const open = openId === g.id;
        const pending = items.reduce((n, i) => n + countOf(i.badge), 0);
        return (
          <div key={g.id}>
            <button
              type="button"
              onClick={() => toggle(g.id)}
              aria-expanded={open}
              aria-controls={`nav-${g.id}`}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-side-muted transition hover:text-side-strong"
            >
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
                    const kids = visibleChildren(i, isAdmin, views);
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
                          <i.icon size={18} />
                          <span className="flex-1 text-left">{i.label}</span>
                          <ChevronRight size={14} className={`transition-transform ${fOpen ? "rotate-90" : ""}`} aria-hidden />
                        </button>
                        {fOpen && (
                          <ul id={`nav-folder-${folderId}`} className="ml-4 space-y-0.5 border-l border-line pl-2">
                            {kids.map((c) => <li key={c.href}>{renderLink(c, countOf(c.badge))}</li>)}
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
