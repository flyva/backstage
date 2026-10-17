"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤔", "😎", "🥳", "😢", "😭", "😡", "😱", "🥺",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👋", "✌️", "🤞", "🔥", "✨", "🎉", "🎊", "❤️", "💔", "💯",
  "😴", "🤯", "🤗", "🙄", "😏", "🤐", "🤢", "🥶", "🥵", "😇", "🤩", "😅", "👀", "💀", "✅", "❌",
];

// Petite grille d'émojis (pas d'appel externe) : clic pour insérer au curseur du champ de message, sans fermer le composeur.
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
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

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Émojis" aria-expanded={open} className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-fg">
        <Smile size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-40 mb-2 grid w-56 grid-cols-8 gap-1 rounded-xl border border-line bg-surface p-2 shadow-xl">
          {EMOJIS.map((e) => (
            <button
              key={e} type="button" role="menuitem"
              onClick={() => { onPick(e); setOpen(false); }}
              className="grid size-6 place-items-center rounded text-lg hover:bg-bg"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
