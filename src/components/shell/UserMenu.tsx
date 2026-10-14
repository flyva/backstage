"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, KeyRound, LogOut, Palette, Settings, Shield, Ticket, User } from "lucide-react";
import { logout } from "@/lib/actions";

type MenuItem = { href: string; label: string; icon: typeof User; hint?: string; badge?: number };

const BASE_ITEMS: MenuItem[] = [
  { href: "/profil", label: "Mon profil", icon: User, hint: "Nom, adresse, planning Ypareo" },
  { href: "/parametres", label: "Personnalisation", icon: Palette, hint: "Thème, couleurs, menu" },
  { href: "/parametres/notifications", label: "Notifications", icon: Bell },
  { href: "/parametres/securite", label: "Sécurité", icon: KeyRound, hint: "Mot de passe" },
];

const ADMIN_ITEM = { href: "/admin", label: "Administration", icon: Shield, hint: "Utilisateurs, rôles, réglages" };
const TICKETS_GESTION_ITEM = { href: "/tickets/gestion", label: "Gestion des tickets", icon: Ticket, hint: "Tous les tickets de la promo" };

// Bouton « Paramètres » (engrenage) avec menu déroulant, et lien vers la page complète.
export function UserMenu({
  name, email, footer, isAdmin = false, canManageTickets = false, ticketsBadge = 0,
}: { name: string; email: string; footer?: ReactNode; isAdmin?: boolean; canManageTickets?: boolean; ticketsBadge?: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const items: MenuItem[] = [
    ...BASE_ITEMS.slice(0, 1),
    { href: "/tickets", label: "Mes tickets", icon: Ticket, hint: "Tes demandes de support", badge: ticketsBadge },
    ...BASE_ITEMS.slice(1),
    ...(canManageTickets ? [TICKETS_GESTION_ITEM] : []),
    ...(isAdmin ? [ADMIN_ITEM] : []),
  ];

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Paramètres"
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg"
      >
        <Settings size={16} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-xs text-muted">{email}</div>
          </div>
          <ul className="p-1.5">
            {items.map(({ href, label, icon: Icon, hint, badge }) => (
              <li key={href}>
                <Link href={href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-bg">
                  <Icon size={16} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1"><span className="block">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
                  {!!badge && (
                    <span className="shrink-0 rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold text-white" aria-label={`${badge} à traiter`}>{badge}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-1.5">
            <Link href="/parametres" role="menuitem" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-accent hover:bg-bg">
              Tous les paramètres <span aria-hidden>→</span>
            </Link>
            {footer}
            <form action={logout}>
              <button role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-bg hover:text-fg"><LogOut size={16} /> Déconnexion</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
