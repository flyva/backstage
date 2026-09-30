"use client";

import { useActionState, useRef, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { LISTING_PHOTO_PREFIX, MAX_LISTING_PHOTOS } from "@/lib/listing-shared";
import { addListingPhotos, deleteListingPhoto, makeMainListingPhoto } from "@/lib/listing-actions";
import { shrinkJpeg } from "@/components/listing-forms";

/** Galerie d'une annonce : la photo principale en grand, les autres en vignettes cliquables. */
export function PhotoGallery({ files, title }: { files: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (files.length === 0) return null;
  const current = files[Math.min(active, files.length - 1)];
  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${LISTING_PHOTO_PREFIX}${current}`} alt={title} className="max-h-[28rem] w-full rounded-xl border border-line bg-bg object-contain" />
      {files.length > 1 && (
        <ul className="flex flex-wrap gap-2" aria-label="Photos de l'annonce">
          {files.map((f, i) => (
            <li key={f}>
              <button type="button" onClick={() => setActive(i)} aria-label={i === 0 ? "Photo principale" : `Photo ${i + 1}`} aria-current={i === active} className={`overflow-hidden rounded-lg border-2 ${i === active ? "border-accent" : "border-transparent opacity-80 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${LISTING_PHOTO_PREFIX}${f}`} alt="" className="size-16 object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Gestion des photos par l'auteur : ajouter, retirer, choisir la photo principale. */
export function PhotoManager({ listingId, files }: { listingId: number; files: string[] }) {
  const [state, action, pending] = useActionState(addListingPhotos, undefined);
  const form = useRef<HTMLFormElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(0);
  const [err, setErr] = useState("");
  const room = MAX_LISTING_PHOTOS - files.length;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = [...(e.target.files ?? [])].slice(0, Math.max(0, room));
    e.target.value = "";
    setErr("");
    try {
      const dt = new DataTransfer();
      for (const f of picked) dt.items.add(await shrinkJpeg(f));
      if (hidden.current) hidden.current.files = dt.files;
      setReady(dt.files.length);
    } catch {
      setErr("Une image est illisible (JPEG, PNG ou WebP attendus).");
      setReady(0);
    }
  }

  return (
    <div className="space-y-4">
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {files.map((f, i) => (
            <li key={f} className={`w-28 overflow-hidden rounded-xl border ${i === 0 ? "border-accent" : "border-line"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${LISTING_PHOTO_PREFIX}${f}`} alt={i === 0 ? "Photo principale" : `Photo ${i + 1}`} className="h-24 w-full object-cover" loading="lazy" />
              {i === 0 ? (
                <span className="flex items-center justify-center gap-1 bg-accent px-1 py-1 text-[11px] font-semibold text-accent-fg"><Star size={11} aria-hidden /> Principale</span>
              ) : (
                <form action={makeMainListingPhoto}>
                  <input type="hidden" name="id" value={listingId} />
                  <input type="hidden" name="file" value={f} />
                  <button className="w-full bg-bg px-1 py-1 text-[11px] text-muted hover:text-fg">Mettre en principale</button>
                </form>
              )}
              <form action={deleteListingPhoto} onSubmit={(e) => { if (!confirm("Supprimer cette photo ?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={listingId} />
                <input type="hidden" name="file" value={f} />
                <button className="flex w-full items-center justify-center gap-1 border-t border-line px-1 py-1 text-[11px] text-muted hover:text-danger"><Trash2 size={11} aria-hidden /> Supprimer</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {files.length === 0 && <p className="text-sm text-muted">Cette annonce n&apos;a pas de photo.</p>}

      {room > 0 ? (
        <form ref={form} action={async (fd) => { await action(fd); setReady(0); if (hidden.current) hidden.current.value = ""; }} className="space-y-2">
          <input type="hidden" name="id" value={listingId} />
          <input ref={hidden} type="file" name="photos" multiple className="hidden" tabIndex={-1} aria-hidden />
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onPick} className="input max-w-xs text-sm" aria-label="Ajouter des photos" />
            <button className="btn" disabled={pending || ready === 0}>{pending ? "Envoi…" : ready > 0 ? `Ajouter ${ready} photo${ready > 1 ? "s" : ""}` : "Ajouter"}</button>
          </div>
          <p className="text-xs text-muted">{files.length}/{MAX_LISTING_PHOTOS} photos · il en reste {room}.</p>
          {err && <p className="text-sm text-danger" role="alert">{err}</p>}
          {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
          {state?.ok && <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>}
        </form>
      ) : (
        <p className="text-xs text-muted">{MAX_LISTING_PHOTOS} photos : c&apos;est le maximum. Supprime-en une pour en ajouter.</p>
      )}
    </div>
  );
}
