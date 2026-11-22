"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export type AdminCard = { href: string; label: string; hint: string; icon: ReactNode };
export type AdminGroup = { key?: string; title: string; cards: AdminCard[] };

// Couleurs pastel des tuiles — reprises telles quelles de la grille d'administration de BDE (AdminClient.tsx),
// qui les fait tourner d'une tuile à l'autre plutôt que de les lier à une catégorie précise.
const SOFT_COLORS = ["#dbeafe", "#fef9c3", "#dcfce7", "#fce7f3", "#f3e8ff", "#ffedd5"];

// Grille d'outils avec recherche — même organisation que la page Administration de BDE : un champ de recherche en
// haut, des rubriques séparées par un filet, des tuiles carrées (icône pastel + libellé + description sur deux
// lignes) qui se filtrent en tapant.
export function AdminTiles({ groups }: { groups: AdminGroup[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  let colorIndex = 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 sm:max-w-xs">
        <Search size={14} className="shrink-0 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un outil d'administration…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {groups.map((g) => {
        const cards = query
          ? g.cards.filter((c) => c.label.toLowerCase().includes(query) || c.hint.toLowerCase().includes(query))
          : g.cards;
        if (cards.length === 0) return null;
        return (
          <section key={g.title} className="space-y-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted">{g.title}</h2>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {cards.map((c) => {
                const soft = SOFT_COLORS[colorIndex++ % SOFT_COLORS.length];
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="flex h-28 flex-col items-start gap-2 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)]"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] text-[#1f2937]" style={{ background: soft }}>
                      {c.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold leading-tight">{c.label}</span>
                      <span className="line-clamp-2 text-[11.5px] leading-tight text-muted">{c.hint}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
