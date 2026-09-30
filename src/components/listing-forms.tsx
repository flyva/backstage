"use client";

import { useActionState, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import { LISTING_CATEGORIES } from "@/db/schema";
import { LISTING_LABEL, MAX_LISTING_PHOTOS } from "@/lib/listing-shared";
import { createListing } from "@/lib/listing-actions";

/** Réduit la photo à 900 px maximum en JPEG avant l'envoi : léger pour le Pi, sans données de localisation (EXIF). */
export async function shrinkJpeg(file: File, max = 900): Promise<File> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
  if (!blob) throw new Error("Image illisible");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

type Item = { id: number; file: File; url: string };

export function ListingForm({ defaultContact }: { defaultContact: string }) {
  const [state, action, pending] = useActionState(createListing, undefined);
  const form = useRef<HTMLFormElement>(null);
  const hidden = useRef<HTMLInputElement>(null); // le champ « photos » réellement envoyé, dans l'ordre choisi
  const [items, setItems] = useState<Item[]>([]);
  const [nextId, setNextId] = useState(1);
  const [err, setErr] = useState("");

  // Met à jour la liste ET le champ envoyé au serveur : la première photo de la liste est la photo principale.
  const commit = (next: Item[]) => {
    setItems(next);
    if (hidden.current) {
      const dt = new DataTransfer();
      next.forEach((i) => dt.items.add(i.file));
      hidden.current.files = dt.files;
    }
  };

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = [...(e.target.files ?? [])];
    e.target.value = ""; // permet de choisir deux fois le même fichier
    setErr("");
    const room = MAX_LISTING_PHOTOS - items.length;
    if (room <= 0) return setErr(`${MAX_LISTING_PHOTOS} photos maximum`);
    const added: Item[] = [];
    let id = nextId;
    for (const f of picked.slice(0, room)) {
      try {
        const small = await shrinkJpeg(f);
        added.push({ id: id++, file: small, url: URL.createObjectURL(small) });
      } catch {
        setErr("Une image est illisible (JPEG, PNG ou WebP attendus).");
      }
    }
    setNextId(id);
    if (picked.length > room) setErr(`${MAX_LISTING_PHOTOS} photos maximum : les suivantes ont été ignorées.`);
    commit([...items, ...added]);
  }

  const makeMain = (id: number) => commit([...items.filter((i) => i.id === id), ...items.filter((i) => i.id !== id)]);
  const remove = (id: number) => {
    const gone = items.find((i) => i.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    commit(items.filter((i) => i.id !== id));
  };

  return (
    <form
      ref={form}
      action={async (fd) => {
        await action(fd);
        form.current?.reset();
        items.forEach((i) => URL.revokeObjectURL(i.url));
        commit([]);
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr_10rem]">
        <div>
          <label className="label" htmlFor="l-category">Catégorie</label>
          <select id="l-category" name="category" defaultValue="vente" className="input">
            {LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{LISTING_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="l-title">Titre</label>
          <input id="l-title" name="title" required maxLength={120} placeholder="Ex. Projecteur PAR LED à vendre" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="l-price">Prix (facultatif)</label>
          <input id="l-price" name="price" maxLength={40} placeholder="50 €, gratuit…" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="l-desc">Description</label>
        <textarea id="l-desc" name="description" required rows={4} maxLength={2000} className="input" placeholder="État, dates, lieu, conditions…" />
      </div>
      <div>
        <label className="label" htmlFor="l-contact">Pour te contacter</label>
        <input id="l-contact" name="contact" required maxLength={160} defaultValue={defaultContact} placeholder="E-mail, téléphone, Instagram…" className="input sm:max-w-md" />
      </div>

      <div className="space-y-2">
        <div className="label">Photos (facultatif, {MAX_LISTING_PHOTOS} maximum)</div>
        {/* Champ réellement envoyé : rempli par le code, dans l'ordre choisi */}
        <input ref={hidden} type="file" name="photos" multiple className="hidden" tabIndex={-1} aria-hidden />
        {items.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {items.map((it, i) => (
              <li key={it.id} className={`relative w-28 overflow-hidden rounded-xl border ${i === 0 ? "border-accent" : "border-line"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt={i === 0 ? "Photo principale" : `Photo ${i + 1}`} className="h-24 w-full object-cover" />
                <button type="button" onClick={() => remove(it.id)} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white" aria-label="Retirer cette photo"><X size={14} /></button>
                {i === 0 ? (
                  <span className="flex items-center justify-center gap-1 bg-accent px-1 py-1 text-[11px] font-semibold text-accent-fg"><Star size={11} aria-hidden /> Principale</span>
                ) : (
                  <button type="button" onClick={() => makeMain(it.id)} className="w-full bg-bg px-1 py-1 text-[11px] text-muted hover:text-fg">Mettre en principale</button>
                )}
              </li>
            ))}
          </ul>
        )}
        {items.length < MAX_LISTING_PHOTOS && (
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onPick} className="input max-w-md text-sm" aria-label="Ajouter des photos" />
        )}
        <p className="text-xs text-muted">La première photo est la photo principale, celle qui s&apos;affiche dans la liste. Clique « Mettre en principale » pour en choisir une autre.</p>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      </div>

      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "Publication…" : "Publier l'annonce"}</button>
        <span className="text-xs text-muted">Publiée tout de suite, visible par les personnes connectées à Backstage pendant 60 jours.</span>
      </div>
    </form>
  );
}
