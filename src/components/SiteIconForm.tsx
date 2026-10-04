"use client";

import { useActionState, useRef, useState } from "react";
import { resetSiteIcon, saveSiteIcon } from "@/lib/site-icon-actions";

const SIZE = 512;

/** Recadre l'image en carré (centre) et la réduit à 512 px en PNG : transparence conservée, métadonnées retirées. */
async function toSquarePng(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  c.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Image illisible");
  return new File([blob], "icon.png", { type: "image/png" });
}

export function SiteIconForm({ version }: { version: number | null }) {
  const [state, action, pending] = useActionState(saveSiteIcon, undefined);
  const form = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErr("");
    if (!f) return;
    try {
      const png = await toSquarePng(f);
      const dt = new DataTransfer();
      dt.items.add(png);
      (form.current!.elements.namedItem("icon") as HTMLInputElement).files = dt.files;
      setPreview(URL.createObjectURL(png));
    } catch {
      setErr("Image illisible (PNG, JPEG ou WebP).");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview ?? `/icon-site${version ? `?v=${version}` : ""}`} alt="Icône actuelle" width={64} height={64} className="size-16 rounded-xl border border-line bg-bg object-cover" />
        <form ref={form} action={action} className="space-y-2">
          <input type="file" name="icon" accept="image/png,image/jpeg,image/webp" onChange={pick} className="block text-sm" />
          <p className="text-xs text-muted">Une image carrée de préférence (elle est recadrée au centre et réduite à 512 px).</p>
          <button className="btn text-sm" disabled={pending || !preview}>{pending ? "Enregistrement…" : "Enregistrer l'icône"}</button>
        </form>
      </div>
      {(err || state?.error) && <p className="text-sm text-danger" role="alert">{err || state?.error}</p>}
      {state?.ok && <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>}
      {version && (
        <form action={resetSiteIcon}><button className="text-xs text-muted underline">Revenir à l&apos;icône d&apos;origine</button></form>
      )}
    </div>
  );
}
