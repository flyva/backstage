"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ImageUp } from "lucide-react";
import jsQR from "jsqr";
import { saveWifiFromQr } from "@/lib/wifi-actions";
import { SECURITY_LABEL, parseWifiQr, type WifiInfo } from "@/lib/wifi";

/** Décode un QR code dans une image, en essayant plusieurs tailles (les photos de QR sont souvent trop grandes ou floues). */
async function decodeQr(file: File): Promise<string | null> {
  const bmp = await createImageBitmap(file);
  try {
    for (const max of [1200, 800, 1800, 500]) {
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const w = Math.max(50, Math.round(bmp.width * scale));
      const h = Math.max(50, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bmp, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
      if (code?.data) return code.data;
    }
    return null;
  } finally {
    bmp.close();
  }
}

// Photo ou image du QR code Wi-Fi de l'école : on le lit, on montre ce qu'il contient, puis on l'enregistre.
// La page École affiche ensuite un QR code propre, régénéré à partir de ces informations.
export function WifiQrImport() {
  const photo = useRef<HTMLInputElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ payload: string; info: WifiInfo } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const read = async (file: File) => {
    setBusy(true);
    setError(null);
    setFound(null);
    setDone(null);
    try {
      const text = await decodeQr(file);
      if (!text) setError("Je ne trouve aucun QR code dans cette image. Recommence en cadrant le QR de face, bien net et bien éclairé.");
      else {
        const info = parseWifiQr(text);
        if (!info) setError("Un QR code a été lu, mais ce n'est pas un QR de connexion Wi-Fi.");
        else setFound({ payload: text, info });
      }
    } catch {
      setError("Image illisible.");
    } finally {
      setBusy(false);
      if (photo.current) photo.current.value = "";
      if (pick.current) pick.current.value = "";
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void read(f); };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Prends en photo le QR code Wi-Fi affiché à l&apos;école (ou envoie une capture) : Backstage le lit et en refait un propre.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={busy} onClick={() => photo.current?.click()}><Camera size={16} /> Prendre une photo</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => pick.current?.click()}><ImageUp size={16} /> Choisir une image</button>
        <input ref={photo} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        <input ref={pick} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {busy && <p className="text-sm text-muted" role="status">Lecture du QR code…</p>}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {done && <p className="text-sm text-green-600 dark:text-green-400" role="status">{done}</p>}
      {found && (
        <div className="space-y-2 rounded-xl border border-line p-4 text-sm">
          <p className="font-medium">QR code lu :</p>
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <div><dt className="inline text-muted">Réseau : </dt><dd className="inline font-medium">{found.info.ssid}</dd></div>
            <div><dt className="inline text-muted">Sécurité : </dt><dd className="inline">{SECURITY_LABEL[found.info.security]}{found.info.eap ? ` (${found.info.eap})` : ""}</dd></div>
            <div><dt className="inline text-muted">Mot de passe : </dt><dd className="inline">{found.info.password ? "•••••• (enregistré)" : "aucun dans le QR"}</dd></div>
            {found.info.identity && <div><dt className="inline text-muted">Identifiant : </dt><dd className="inline">{found.info.identity}</dd></div>}
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => start(async () => {
                const res = await saveWifiFromQr(found.payload);
                if (res?.error) setError(res.error);
                else { setDone(res?.ok ?? "Enregistré"); setFound(null); }
              })}
            >
              {pending ? "Enregistrement…" : "Enregistrer et refaire le QR"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setFound(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
