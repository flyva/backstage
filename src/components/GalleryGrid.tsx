"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Trash2, X } from "lucide-react";
import { deleteItem } from "@/lib/gallery-actions";

export type GalleryItem = {
  id: number;
  kind: "image" | "video";
  file: string;
  thumb: string | null;
  caption: string | null;
  uploader: string;
  canDelete: boolean;
};

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  // <dialog> natif : focus piégé, Échap et arrière-plan gérés par le navigateur.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const current = open !== null ? items[open] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((it, i) => (
          <li key={it.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-bg">
            <button onClick={() => setOpen(i)} className="block size-full" aria-label={it.caption ?? `Ouvrir le média ${i + 1}`}>
              {it.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/media/${it.thumb ?? it.file}`} alt={it.caption ?? ""} loading="lazy" className="size-full object-cover" />
              ) : (
                <>
                  <video src={`/media/${it.file}#t=0.1`} preload="metadata" muted className="size-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/20 text-white"><Play size={28} fill="currentColor" /></span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={close}
        onClick={(e) => e.target === dialog.current && close()}
        className="m-auto max-h-[95vh] w-[min(95vw,1100px)] rounded-xl border border-line bg-surface p-0 text-fg backdrop:bg-black/80"
      >
        {current && (
          <div className="flex flex-col">
            <div className="relative flex min-h-64 items-center justify-center bg-black">
              {current.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/media/${current.file}`} alt={current.caption ?? ""} className="max-h-[75vh] w-auto max-w-full object-contain" />
              ) : (
                <video key={current.id} src={`/media/${current.file}`} controls autoPlay className="max-h-[75vh] max-w-full" />
              )}
              {items.length > 1 && (
                <>
                  <button onClick={() => step(-1)} aria-label="Précédent" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"><ChevronLeft /></button>
                  <button onClick={() => step(1)} aria-label="Suivant" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"><ChevronRight /></button>
                </>
              )}
              <button onClick={close} aria-label="Fermer" className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                {current.caption && <p className="font-medium">{current.caption}</p>}
                <p className="text-xs text-muted">Ajouté par {current.uploader}</p>
              </div>
              {current.canDelete && (
                <form action={deleteItem} onSubmit={(e) => { if (!confirm("Supprimer ce média ?")) e.preventDefault(); else close(); }}>
                  <input type="hidden" name="itemId" value={current.id} />
                  <button className="btn-ghost text-danger"><Trash2 size={14} /> Supprimer</button>
                </form>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
