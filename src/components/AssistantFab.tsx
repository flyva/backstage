"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Maximize2, X } from "lucide-react";
import { AssistantChat } from "@/components/AssistantChat";
import { SUGGESTIONS } from "@/lib/assistant-suggestions";

// Bouton flottant en bas à droite : ouvre l'assistant dans un panneau, sans quitter la page. La conversation est gardée
// tant que la page n'est pas rechargée (le panneau est seulement masqué quand on le ferme).
export function AssistantFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname.startsWith("/assistant")) return null; // la page dédiée a déjà le chat

  return (
    <div className="print:hidden">
      <div
        role="dialog"
        aria-label="Assistant"
        hidden={!open}
        className="fixed bottom-20 right-3 z-50 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:right-5"
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Bot size={18} className="text-accent" aria-hidden />
          <h2 className="flex-1 text-sm font-semibold">Assistant</h2>
          <Link href="/assistant" className="rounded-lg p-1.5 text-muted hover:text-fg" aria-label="Ouvrir en pleine page" title="Pleine page"><Maximize2 size={15} /></Link>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:text-fg" aria-label="Fermer l'assistant"><X size={16} /></button>
        </header>
        <AssistantChat suggestions={SUGGESTIONS.slice(0, 5)} compact />
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        className="fixed bottom-4 right-3 z-50 grid size-14 place-items-center rounded-full bg-accent text-accent-fg shadow-lg transition hover:scale-105 sm:right-5"
      >
        {open ? <X size={22} /> : <Bot size={24} />}
      </button>
    </div>
  );
}
