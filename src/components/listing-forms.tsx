"use client";

import { useActionState, useRef, useState } from "react";
import { LISTING_CATEGORIES } from "@/db/schema";
import { LISTING_LABEL } from "@/lib/listing-shared";
import { createListing } from "@/lib/listing-actions";

/** Réduit la photo à 900 px maximum en JPEG avant l'envoi : léger pour le Pi, sans données de localisation (EXIF). */
async function shrinkJpeg(file: File, max = 900): Promise<File> {
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

export function ListingForm({ defaultContact }: { defaultContact: string }) {
  const [state, action, pending] = useActionState(createListing, undefined);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErr("");
    setPreview(null);
    if (!f) return;
    try {
      const small = await shrinkJpeg(f);
      const dt = new DataTransfer();
      dt.items.add(small);
      if (input.current) input.current.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      if (input.current) input.current.value = "";
      setErr("Image illisible : essaie un fichier JPEG, PNG ou WebP.");
    }
  }

  return (
    <form
      ref={form}
      action={async (fd) => {
        await action(fd);
        form.current?.reset();
        setPreview(null);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="l-contact">Pour te contacter</label>
          <input id="l-contact" name="contact" required maxLength={160} defaultValue={defaultContact} placeholder="E-mail, téléphone, Instagram…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="l-photo">Photo (facultatif)</label>
          <input ref={input} id="l-photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="input text-sm" />
        </div>
      </div>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Aperçu de la photo" className="max-h-40 rounded-xl border border-line" />
      )}
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "Publication…" : "Publier l'annonce"}</button>
        <span className="text-xs text-muted">Publiée tout de suite, visible par les personnes connectées à Backstage pendant 60 jours.</span>
      </div>
    </form>
  );
}
