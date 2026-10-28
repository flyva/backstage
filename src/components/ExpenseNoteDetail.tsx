"use client";

import { useState } from "react";
import { Check, Copy, X, ZoomIn } from "lucide-react";

/** Ligne champ + valeur + bouton de copie compact (icône seule), pour lister les infos d'une note de frais. */
export function FieldRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-2 border-b border-line py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* presse-papiers indisponible */ } }}
        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-bg hover:text-accent"
        aria-label={`Copier ${label.toLowerCase()}`}
      >
        {copied ? <Check size={15} className="text-accent" /> : <Copy size={15} />}
      </button>
    </div>
  );
}

/** Galerie de reçus : vignettes raisonnables, clic pour agrandir en plein écran. */
export function ExpensePhotoGallery({ photos }: { photos: { src: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="space-y-2">
        {photos.map((p, i) => (
          <button key={p.src} type="button" onClick={() => setOpen(p.src)} className="group relative block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={`Reçu ${i + 1}`} className="max-h-80 w-full rounded-xl border border-line object-contain" />
            <span className="absolute right-2 top-2 rounded-lg bg-bg/90 p-1.5 text-muted opacity-0 shadow transition-opacity group-hover:opacity-100">
              <ZoomIn size={15} />
            </span>
          </button>
        ))}
      </div>
      {open && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(null)}
          onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") setOpen(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <button type="button" onClick={() => setOpen(null)} aria-label="Fermer" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="Reçu agrandi" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
