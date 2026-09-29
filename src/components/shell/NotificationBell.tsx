"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Check, Images, Newspaper, PartyPopper, UserCheck, type LucideIcon } from "lucide-react";
import { markNotificationsSeen } from "@/lib/actions";

export type NotifItem = {
  key: string;
  kind: "news" | "bde" | "gallery" | "loan" | "alert" | "approval";
  text: string;
  when: string;
  href: string;
  unread: boolean;
};

const ICON: Record<NotifItem["kind"], { icon: LucideIcon; color: string }> = {
  news: { icon: Newspaper, color: "#17a2b8" },
  bde: { icon: PartyPopper, color: "#e11d74" },
  gallery: { icon: Images, color: "#7c5cff" },
  loan: { icon: Check, color: "#28a745" },
  alert: { icon: AlertTriangle, color: "#dc3545" },
  approval: { icon: UserCheck, color: "#f59e0b" },
};

// Cloche : pastille du nombre de nouveautés ; l'ouverture les marque comme vues.
export function NotificationBell({ items, unread }: { items: NotifItem[]; unread: number }) {
  const [open, setOpen] = useState(false);
  // Nombre de nouveautés déjà vues à l'ouverture de la cloche : la pastille n'affiche que ce qui arrive ensuite.
  const [acked, setAcked] = useState(0);
  const count = unread > acked ? unread - acked : 0;
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // À l'ouverture : la pastille disparaît tout de suite, et on l'enregistre côté serveur.
    if (next && count > 0) { setAcked(unread); void markNotificationsSeen(); }
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={toggle}
        aria-label={count > 0 ? `Notifications : ${count} nouvelle${count > 1 ? "s" : ""}` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#dc3545] px-1 text-[10px] font-semibold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Link href="/parametres/notifications" onClick={() => setOpen(false)} className="text-xs text-accent underline">Réglages</Link>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Rien de nouveau pour le moment.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((n) => {
                const { icon: Icon, color } = ICON[n.kind];
                return (
                  <li key={n.key}>
                    <Link href={n.href} role="menuitem" onClick={() => setOpen(false)} className={`flex gap-3 px-4 py-3 text-sm hover:bg-bg ${n.unread ? "bg-accent/5" : ""}`}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ background: color }}><Icon size={14} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block leading-snug">{n.text}</span>
                        <span className="text-xs text-muted">{n.when}</span>
                      </span>
                      {n.unread && <i className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Non lue" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
