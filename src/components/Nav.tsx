"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Briefcase, Calculator, Car, Library, CalendarDays, Camera, CircleHelp, Home, Images, Link2, Newspaper, Package, PartyPopper, School, NotebookPen, Settings, Shield, SquareKanban, TramFront, User,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; badge?: "loans"; adminOnly?: boolean; module?: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Principal",
    items: [
      { href: "/", label: "Accueil", icon: Home },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/mobilite", label: "Mobilité", icon: TramFront },
      { href: "/alternance", label: "Alternance", icon: NotebookPen },
    ],
  },
  {
    title: "Travail",
    items: [
      { href: "/projets", label: "Projets", icon: Briefcase },
      { href: "/kanban", label: "Mon kanban", icon: SquareKanban },
      { href: "/wiki", label: "Wiki", icon: BookOpen },
      { href: "/bibliotheque", label: "Bibliothèque", icon: Library },
      { href: "/calculettes", label: "Calculettes", icon: Calculator },
      { href: "/materiel", label: "Matériel", icon: Package, badge: "loans", module: "materiel" },
    ],
  },
  {
    title: "Vie de promo",
    items: [
      { href: "/actus", label: "Actualités", icon: Newspaper, module: "actus" },
      { href: "/covoiturage", label: "Covoiturage", icon: Car },
      { href: "/bde", label: "BDE", icon: PartyPopper, module: "bde" },
      { href: "/galerie", label: "Galerie", icon: Images, module: "galerie" },
      { href: "/instagram", label: "Instagram", icon: Camera },
    ],
  },
  {
    title: "École",
    items: [
      { href: "/ecole", label: "Wi-Fi et plan", icon: School },
      { href: "/faq", label: "FAQ", icon: CircleHelp },
      { href: "/liens", label: "Liens utiles", icon: Link2 },
    ],
  },
  {
    title: "Compte",
    items: [
      { href: "/profil", label: "Profil", icon: User },
      { href: "/parametres", label: "Paramètres", icon: Settings },
      { href: "/admin", label: "Administration", icon: Shield, adminOnly: true },
    ],
  },
];

export function Nav({ isAdmin, loanBadge, views }: { isAdmin: boolean; loanBadge: number; views: Record<string, boolean> }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-4" aria-label="Navigation principale">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => (!i.adminOnly || isAdmin) && (!i.module || views[i.module]));
        return (
          <div key={g.title}>
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-side-muted">{g.title}</div>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon, badge }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                const count = badge === "loans" ? loanBadge : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        active ? "bg-accent text-accent-fg shadow-[0_2px_8px_color-mix(in_srgb,var(--accent)_40%,transparent)]" : "text-side-text hover:bg-side-hover hover:text-side-strong"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{label}</span>
                      {count > 0 && (
                        <span className="rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold text-white" aria-label={`${count} à traiter`}>{count}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
