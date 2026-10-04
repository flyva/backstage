"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, BookUser, Bot, Briefcase, Calculator, Car, ChevronRight, Library, CalendarDays, Camera, CircleHelp, Home, Images, Link2, Newspaper, Package, PartyPopper, School, NotebookPen, SquareKanban, TramFront, Users, Contact, Megaphone, CalendarClock, MessageSquare,
  type LucideIcon,
} from "lucide-react";

type Badge = "loans" | "messages";
type Item = { href: string; label: string; icon: LucideIcon; badge?: Badge; adminOnly?: boolean; module?: string };
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
      { href: "/alternance", label: "Alternance", icon: NotebookPen },
      { href: "/messages", label: "Messages", icon: MessageSquare, badge: "messages" },
    ],
  },
  {
    id: "travail", title: "Travail",
    items: [
      { href: "/cours", label: "Mes cours", icon: NotebookPen },
      { href: "/projets", label: "Projets", icon: Briefcase },
      { href: "/kanban", label: "Mon kanban", icon: SquareKanban },
      { href: "/materiel", label: "Matériel", icon: Package, badge: "loans", module: "materiel" },
      { href: "/reseau", label: "Carnet de réseau", icon: Contact },
      { href: "/calculettes", label: "Calculettes", icon: Calculator },
    ],
  },
  {
    id: "savoirs", title: "Savoirs",
    items: [
      { href: "/wiki", label: "Wiki", icon: BookOpen },
      { href: "/bibliotheque", label: "Bibliothèque", icon: Library },
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

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function Nav({ isAdmin, loanBadge, messageBadge = 0, views }: { isAdmin: boolean; loanBadge: number; messageBadge?: number; views: Record<string, boolean> }) {
  const pathname = usePathname();
  // Groupe ouvert : celui de la page en cours, sauf si la personne en a choisi un autre (ou tout refermé) sur cette page.
  // Changer de page revient au groupe de la nouvelle page.
  const [choice, setChoice] = useState<{ id: string | null; path: string } | null>(null);
  const activeId = GROUPS.find((g) => g.items.some((i) => isActive(pathname, i.href)))?.id ?? GROUPS[0].id;
  const openId = choice && choice.path === pathname ? choice.id : activeId;
  const toggle = (id: string) => setChoice({ id: openId === id ? null : id, path: pathname });
  const countOf = (badge?: Badge) => (badge === "loans" ? loanBadge : badge === "messages" ? messageBadge : 0);

  return (
    <nav className="space-y-0.5" aria-label="Navigation principale">
      {GROUPS.map((g) => {
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
                {items.map(({ href, label, icon: Icon, badge }) => {
                  const active = isActive(pathname, href);
                  const count = countOf(badge);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm transition ${
                          active ? "bg-accent text-accent-fg shadow-[0_2px_8px_color-mix(in_srgb,var(--accent)_40%,transparent)]" : "text-side-text hover:bg-side-hover hover:text-side-strong"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="flex-1">{label}</span>
                        {count > 0 && (
                          <span className="rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold text-white" aria-label={badge === "messages" ? `${count} non lu(s)` : `${count} à traiter`}>{count}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
