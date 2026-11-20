"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions";

type MenuItem = { href: string; label: string; badge?: number };

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

// Bouton avatar (initiales) avec menu déroulant — repris tel quel du menu utilisateur de BDE
// (mêmes groupes : profil/réglages, puis aide, puis déconnexion).
export function UserMenu({
  name, email, footer, canManageTickets = false, ticketsBadge = 0, showAlternance = true, isAlternant = true,
}: { name: string; email: string; footer?: ReactNode; canManageTickets?: boolean; ticketsBadge?: number; showAlternance?: boolean; isAlternant?: boolean }) {
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

  const profileItems: MenuItem[] = [
    { href: "/profil", label: "Mon profil" },
    { href: "/parametres", label: "Paramètres" },
    { href: "/profil?onglet=confidentialite", label: "Confidentialité & mes données" },
    ...(showAlternance ? [{ href: "/profil?onglet=alternance", label: isAlternant ? "Alternance" : "Stage" }] : []),
  ];

  const aideItems: MenuItem[] = [
    { href: "/tickets", label: "Mes tickets", badge: ticketsBadge },
    ...(canManageTickets ? [{ href: "/tickets/gestion", label: "Gestion des tickets" }] : []),
    { href: "/faq", label: "FAQ" },
  ];

  const renderItem = ({ href, label, badge }: MenuItem) => (
    <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-md px-3.5 py-[7px] text-[13px] hover:bg-bg">
      {label}
      {!!badge && (
        <span className="shrink-0 rounded-full bg-[#dc3545] px-1.5 text-[10px] font-semibold text-white" aria-label={`${badge} à traiter`}>{badge}</span>
      )}
    </Link>
  );

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu utilisateur"
        aria-expanded={open}
        aria-haspopup="menu"
        className="iconbtn p-[3px]"
      >
        <span className="grid size-[30px] place-items-center rounded-full bg-accent/15 text-[13px] font-bold text-accent">{initials(name)}</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-[260px] max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.12)]">
          <div className="mb-1 border-b border-line px-3.5 pb-2 pt-2.5">
            <div className="truncate text-[13.5px] font-semibold">{name}</div>
            <div className="truncate text-xs text-muted">{email}</div>
          </div>
          {profileItems.map(renderItem)}
          <div className="my-1 border-t border-line" />
          {aideItems.map(renderItem)}
          {footer && <div className="my-1 border-t border-line pt-1">{footer}</div>}
          <div className="my-1 border-t border-line" />
          <form action={logout}>
            <button role="menuitem" className="flex w-full items-center rounded-md px-3.5 py-[7px] text-[13px] text-danger">Déconnexion</button>
          </form>
        </div>
      )}
    </div>
  );
}
