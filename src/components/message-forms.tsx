"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bold, File as FileIcon, Image as ImageIcon, Italic, Link2, List, MessageCircle, Paperclip, Send, Strikethrough, X } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { saveReview, sendMessage, startConversation, startDirectConversation } from "@/lib/message-actions";
import { EmojiPicker } from "@/components/EmojiPicker";
import type { LiveMessage } from "@/lib/message-bus";

const MAX_MESSAGE_FILES = 6; // doit rester égal à MAX_MESSAGE_FILES dans message-files.ts (module serveur, non importable ici)
const MAX_MESSAGE_FILE_BYTES = 15 * 1024 * 1024;

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

// Entrée envoie le message ; Maj + Entrée fait un retour à la ligne. On n'envoie pas pendant une saisie assistée (clavier japonais, suggestions…).
const submitOnEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault();
    if (e.currentTarget.value.trim()) e.currentTarget.form?.requestSubmit();
  }
};

/** Premier message depuis une annonce. */
export function StartConversationForm({ listingId, sellerName }: { listingId: number; sellerName: string }) {
  const [state, action, pending] = useActionState(startConversation, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="label" htmlFor="m-first">Écrire à {sellerName}</label>
      <textarea id="m-first" name="body" required rows={3} maxLength={2000} onKeyDown={submitOnEnter} className="input" placeholder="Bonjour, est-ce que c'est toujours disponible ?" />
      <p className="text-xs text-muted">Entrée pour envoyer, Maj + Entrée pour un retour à la ligne.</p>
      <Feedback state={state} />
      <button className="btn" disabled={pending}><Send size={15} /> {pending ? "Envoi…" : "Envoyer le message"}</button>
    </form>
  );
}

/** Bouton « Envoyer un message » sur une fiche annuaire : ouvre (ou reprend) la conversation directe avec cette personne. */
export function MessageButton({ otherUserId }: { otherUserId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn w-full"
        onClick={() => start(async () => {
          const res = await startDirectConversation(otherUserId);
          if ("error" in res) setError(res.error);
          else router.push(`/messages/${res.conversationId}`);
        })}
      >
        <MessageCircle size={16} aria-hidden /> {pending ? "Ouverture…" : "Envoyer un message"}
      </button>
      {error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}

const fileSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`);

let nextPendingId = 0;
type Pending = { id: number; file: File; previewUrl: string | null };

/** Insère ou enveloppe la sélection du champ de texte (gras, italique…), puis rend la main au champ. */
function wrapSelection(ref: React.RefObject<HTMLTextAreaElement | null>, before: string, after: string, placeholder: string) {
  const el = ref.current;
  if (!el) return;
  const { selectionStart: s, selectionEnd: e, value } = el;
  const hasSelection = s !== e;
  const middle = hasSelection ? value.slice(s, e) : placeholder;
  el.value = value.slice(0, s) + before + middle + after + value.slice(e);
  el.focus();
  el.setSelectionRange(s + before.length, s + before.length + middle.length);
}

function prefixLine(ref: React.RefObject<HTMLTextAreaElement | null>, prefix: string) {
  const el = ref.current;
  if (!el) return;
  const { selectionStart: s, value } = el;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  el.value = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  el.focus();
  el.setSelectionRange(s + prefix.length, s + prefix.length);
}

/** Zone de réponse d'une conversation : éditeur de texte (gras, italique, liste, lien), émojis, photos, fichiers, réponse à un message. */
export function MessageComposer({ conversationId, replyTo, onCancelReply }: { conversationId: number; replyTo?: LiveMessage | null; onCancelReply?: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastPing = useRef(0);
  const [pendingFiles, setPendingFiles] = useState<Pending[]>([]);
  const [error, setError] = useState("");

  // Le focus suit l'ouverture d'une réponse : prêt à taper tout de suite.
  useEffect(() => { if (replyTo) textarea.current?.focus(); }, [replyTo]);

  // Prévient l'autre personne qu'on est en train d'écrire (au plus toutes les 2,5 s ; rien n'est enregistré).
  const ping = () => {
    const now = Date.now();
    if (now - lastPing.current < 2500) return;
    lastPing.current = now;
    void fetch(`/api/messages/${conversationId}/typing`, { method: "POST" }).catch(() => {});
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setError("");
    const incoming = [...list];
    if (pendingFiles.length + incoming.length > MAX_MESSAGE_FILES) { setError(`${MAX_MESSAGE_FILES} fichiers maximum`); return; }
    const tooBig = incoming.find((f) => f.size > MAX_MESSAGE_FILE_BYTES);
    if (tooBig) { setError(`« ${tooBig.name} » dépasse 15 Mo`); return; }
    setPendingFiles((cur) => [...cur, ...incoming.map((file) => ({ id: nextPendingId++, file, previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null }))]);
  };
  const removeFile = (id: number) => setPendingFiles((cur) => {
    const hit = cur.find((p) => p.id === id);
    if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
    return cur.filter((p) => p.id !== id);
  });

  const submit = () => {
    const text = textarea.current?.value.trim() ?? "";
    if (!text && pendingFiles.length === 0) return;
    const fd = new FormData();
    fd.set("conversationId", String(conversationId));
    fd.set("body", text);
    if (replyTo) fd.set("replyToId", String(replyTo.id));
    for (const p of pendingFiles) fd.append("files", p.file);
    const sentFiles = pendingFiles;
    startTransition(async () => {
      const res = await sendMessage(undefined, fd);
      setError(res?.error ?? "");
    });
    if (textarea.current) textarea.current.value = "";
    for (const p of sentFiles) if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    setPendingFiles([]);
    onCancelReply?.();
    lastPing.current = 0;
    window.dispatchEvent(new Event("conv-sync"));
  };

  const submitOnEnterCustom = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (e.currentTarget.value.trim() || pendingFiles.length > 0) void submit();
    }
  };

  return (
    <form ref={form} onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-2">
      {replyTo && (
        <div className="flex items-start gap-2 rounded-lg border-l-2 border-accent bg-bg px-2.5 py-1.5 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-accent">Réponse</p>
            <p className="truncate text-muted">{replyTo.body || "Pièce jointe"}</p>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Annuler la réponse" className="shrink-0 rounded p-0.5 text-muted hover:text-fg"><X size={14} /></button>
        </div>
      )}

      <div className="flex items-center gap-0.5 rounded-t-xl border border-b-0 border-line bg-bg px-1 py-1">
        <button type="button" title="Gras" onClick={() => wrapSelection(textarea, "**", "**", "texte")} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"><Bold size={15} /></button>
        <button type="button" title="Italique" onClick={() => wrapSelection(textarea, "*", "*", "texte")} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"><Italic size={15} /></button>
        <button type="button" title="Barré" onClick={() => wrapSelection(textarea, "~~", "~~", "texte")} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"><Strikethrough size={15} /></button>
        <button type="button" title="Liste" onClick={() => prefixLine(textarea, "- ")} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"><List size={15} /></button>
        <button
          type="button" title="Lien"
          onClick={() => { const url = window.prompt("Adresse du lien (https://…)"); if (url) wrapSelection(textarea, "[", `](${url})`, "texte du lien"); }}
          className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"
        ><Link2 size={15} /></button>
        <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
        <EmojiPicker onPick={(e) => { const el = textarea.current; if (!el) return; const s = el.selectionStart; el.value = el.value.slice(0, s) + e + el.value.slice(el.selectionEnd); el.focus(); el.setSelectionRange(s + e.length, s + e.length); }} />
        <button type="button" title="Photo" onClick={() => photoInput.current?.click()} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"><ImageIcon size={15} /></button>
        <button type="button" title="Fichier" onClick={() => fileInput.current?.click()} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"><Paperclip size={15} /></button>
        <input ref={photoInput} type="file" accept="image/*,.gif" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>
      <textarea
        ref={textarea} name="body" rows={2} maxLength={2000} onKeyDown={submitOnEnterCustom} onInput={ping}
        className="input rounded-t-none" placeholder="Ton message… (Entrée pour envoyer, Maj + Entrée pour aller à la ligne)" aria-label="Ton message"
      />

      {pendingFiles.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {pendingFiles.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-bg py-1 pl-1 pr-2 text-xs">
              {p.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.previewUrl} alt="" className="size-8 rounded object-cover" />
              ) : (
                <span className="grid size-8 place-items-center rounded bg-surface text-muted"><FileIcon size={14} /></span>
              )}
              <span className="max-w-32 truncate">{p.file.name}</span>
              <span className="text-muted">{fileSize(p.file.size)}</span>
              <button type="button" onClick={() => removeFile(p.id)} aria-label={`Retirer ${p.file.name}`} className="rounded p-0.5 text-muted hover:text-fg"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button className="btn" disabled={pending}><Send size={15} /> {pending ? "Envoi…" : "Envoyer"}</button>
    </form>
  );
}

/** Note de 1 à 5 étoiles et commentaire sur l'autre personne. */
export function ReviewForm({ conversationId, subjectName, initialRating, initialComment }: { conversationId: number; subjectName: string; initialRating: number; initialComment: string }) {
  const [state, action, pending] = useActionState(saveReview, undefined);
  const [rating, setRating] = useState(initialRating);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-1" role="radiogroup" aria-label={`Note pour ${subjectName}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sur 5`}
            onClick={() => setRating(n)}
            className={`text-3xl leading-none transition ${n <= rating ? "text-[#f59e0b]" : "text-line hover:text-[#f59e0b]/60"}`}
          >★</button>
        ))}
        <span className="ml-2 text-sm text-muted">{rating ? `${rating} sur 5` : "Choisis une note"}</span>
      </div>
      <textarea name="comment" rows={3} maxLength={500} defaultValue={initialComment} className="input" placeholder={`Comment s'est passé l'échange avec ${subjectName} ? (facultatif)`} aria-label="Commentaire" />
      <Feedback state={state} />
      <button className="btn" disabled={pending || rating === 0}>{pending ? "Enregistrement…" : initialRating ? "Mettre à jour mon avis" : "Publier mon avis"}</button>
    </form>
  );
}
