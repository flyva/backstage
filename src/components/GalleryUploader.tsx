"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

type Status = { name: string; state: "pending" | "uploading" | "done" | "error"; pct: number; error?: string };

// Redimensionne dans le navigateur : le serveur (Raspberry Pi 32 bits) n'a pas à décoder les images.
async function toJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion impossible"))), "image/jpeg", quality));
}

function send(url: string, body: XMLHttpRequestBodyInit, onProgress: (pct: number) => void, headers?: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [k, v] of Object.entries(headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Erreur ${xhr.status}`;
      try { msg = JSON.parse(xhr.responseText).error ?? msg; } catch { /* réponse non JSON */ }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Réseau indisponible"));
    xhr.send(body);
  });
}

export function GalleryUploader({ albumId }: { albumId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Status[]>([]);
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<Status>) => setItems((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));

  async function run(files: File[]) {
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, state: "pending", pct: 0 })));
    for (const [i, file] of files.entries()) {
      patch(i, { state: "uploading" });
      try {
        if (file.type.startsWith("image/")) {
          const bitmap = await createImageBitmap(file).catch(() => {
            throw new Error("Format d'image non supporté par ton navigateur (essaie JPEG ou PNG)");
          });
          const [main, thumb] = await Promise.all([toJpeg(bitmap, 1600, 0.85), toJpeg(bitmap, 480, 0.8)]);
          bitmap.close();
          const fd = new FormData();
          fd.set("albumId", String(albumId));
          fd.set("file", main, "photo.jpg");
          fd.set("thumb", thumb, "thumb.jpg");
          await send("/api/gallery/image", fd, (pct) => patch(i, { pct }));
        } else if (file.type === "video/mp4" || file.type === "video/webm") {
          await send(`/api/gallery/video?albumId=${albumId}`, file, (pct) => patch(i, { pct }), { "Content-Type": file.type });
        } else {
          throw new Error("Type de fichier non supporté (photos, MP4 ou WebM)");
        }
        patch(i, { state: "done", pct: 100 });
      } catch (e) {
        patch(i, { state: "error", error: e instanceof Error ? e.message : "Échec" });
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className={`btn w-fit cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
        <Upload size={16} /> {busy ? "Envoi en cours…" : "Ajouter des photos / vidéos"}
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*,video/mp4,video/webm"
          className="sr-only"
          disabled={busy}
          onChange={(e) => e.target.files?.length && run([...e.target.files])}
        />
      </label>
      {items.length > 0 && (
        <ul className="space-y-1 text-xs" aria-live="polite">
          {items.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              {s.state === "uploading" && <span className="tabular-nums text-muted">{s.pct} %</span>}
              {s.state === "done" && <span className="text-green-600 dark:text-green-400">✓</span>}
              {s.state === "error" && <span className="text-danger">{s.error}</span>}
              {s.state === "pending" && <span className="text-muted">en attente</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Photos redimensionnées automatiquement · vidéos MP4 ou WebM, 150 Mo max.</p>
    </div>
  );
}
