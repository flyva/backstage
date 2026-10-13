"use client";

import { useActionState, useRef, useState } from "react";
import { resetSiteIcon, saveSiteIcon } from "@/lib/site-icon-actions";

const SIZE = 512;
// Zone de sécurité « maskable » : Android (et d'autres launchers) peuvent rogner jusqu'au bord d'un cercle de 80 % du
// canevas. Le logo est donc réduit dans ce cercle, sur un fond plein (sinon la zone rognée est transparente/moche).
const SAFE_RATIO = 0.8;

/** Recadre l'image en carré (centre) et la réduit à 512 px en PNG, plein cadre : transparence conservée. */
function drawSquare(c: HTMLCanvasElement, bmp: ImageBitmap) {
  const side = Math.min(bmp.width, bmp.height);
  c.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
}

/** Même logo, réduit dans la zone de sécurité sur un fond plein : version qu'Android peut découper sans rogner le dessin. */
function drawMaskable(c: HTMLCanvasElement, bmp: ImageBitmap, bg: string) {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const side = Math.min(bmp.width, bmp.height);
  const inner = SIZE * SAFE_RATIO;
  const off = (SIZE - inner) / 2;
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, off, off, inner, inner);
}

const toPng = (c: HTMLCanvasElement, name: string) =>
  new Promise<File>((resolve, reject) => {
    c.toBlob((blob) => (blob ? resolve(new File([blob], name, { type: "image/png" })) : reject(new Error("Image illisible"))), "image/png");
  });

export function SiteIconForm({ version }: { version: number | null }) {
  const [state, action, pending] = useActionState(saveSiteIcon, undefined);
  const form = useRef<HTMLFormElement>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [maskedPreview, setMaskedPreview] = useState<string | null>(null);
  const [bg, setBg] = useState("#0e0e13");
  const [err, setErr] = useState("");

  async function render(bgColor: string) {
    if (!bitmap.current) return;
    const plain = document.createElement("canvas");
    plain.width = plain.height = SIZE;
    drawSquare(plain, bitmap.current);
    const masked = document.createElement("canvas");
    masked.width = masked.height = SIZE;
    drawMaskable(masked, bitmap.current, bgColor);

    const [iconFile, maskFile] = await Promise.all([toPng(plain, "icon.png"), toPng(masked, "icon-maskable.png")]);
    const dtIcon = new DataTransfer(); dtIcon.items.add(iconFile);
    const dtMask = new DataTransfer(); dtMask.items.add(maskFile);
    (form.current!.elements.namedItem("icon") as HTMLInputElement).files = dtIcon.files;
    (form.current!.elements.namedItem("maskable") as HTMLInputElement).files = dtMask.files;
    setPreview(URL.createObjectURL(iconFile));
    setMaskedPreview(URL.createObjectURL(maskFile));
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErr("");
    if (!f) return;
    try {
      bitmap.current = await createImageBitmap(f);
      await render(bg);
    } catch {
      setErr("Image illisible (PNG, JPEG ou WebP).");
    }
  }

  const changeBg = async (v: string) => {
    setBg(v);
    await render(v);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview ?? `/icon-site${version ? `?v=${version}` : ""}`} alt="Icône actuelle" width={64} height={64} className="size-16 rounded-xl border border-line bg-bg object-cover" />
          <p className="mt-1 text-[10px] text-muted">Onglet, iOS</p>
        </div>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={maskedPreview ?? `/icon-site/maskable${version ? `?v=${version}` : ""}`} alt="Icône Android (découpée en rond pour l'aperçu)" width={64} height={64} className="size-16 rounded-full border border-line object-cover" />
          <p className="mt-1 text-[10px] text-muted">Android installé</p>
        </div>
        <form ref={form} action={action} className="space-y-2">
          {/* Fichiers réels (masqués) : remplis par pick()/changeBg() avec les deux versions générées depuis l'image choisie. */}
          <input type="file" name="icon" className="hidden" aria-hidden />
          <input type="file" name="maskable" className="hidden" aria-hidden />
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="block text-sm" />
          <label className="flex items-center gap-2 text-xs text-muted">
            Fond de la version Android
            <input type="color" value={bg} onChange={(e) => void changeBg(e.target.value)} className="h-6 w-10 cursor-pointer rounded border border-line bg-transparent p-0.5" />
          </label>
          <p className="text-xs text-muted">Image carrée de préférence. Elle est recadrée au centre et déclinée en deux versions : une pleine (onglet, iPhone) et une avec marge sur fond plein (Android, qui découpe sinon le logo en rond ou en carré arrondi).</p>
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
