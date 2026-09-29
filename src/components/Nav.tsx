"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, School, CircleHelp, Link2, User, Shield } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/ecole", label: "École", icon: School },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
  { href: "/liens", label: "Liens utiles", icon: Link2 },
  { href: "/profil", label: "Profil", icon: User },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: "Admin", icon: Shield }] : ITEMS;
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Navigation principale">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
              active ? "bg-accent/15 font-medium text-accent" : "text-muted hover:bg-bg hover:text-fg"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
