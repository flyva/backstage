"use client";

import { useActionState, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { saveReview, sendMessage, startConversation } from "@/lib/message-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

// Ctrl/Cmd + Entrée envoie le message.
const submitOnCtrlEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); }
};

/** Premier message depuis une annonce. */
export function StartConversationForm({ listingId, sellerName }: { listingId: number; sellerName: string }) {
  const [state, action, pending] = useActionState(startConversation, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="label" htmlFor="m-first">Écrire à {sellerName}</label>
      <textarea id="m-first" name="body" required rows={3} maxLength={2000} onKeyDown={submitOnCtrlEnter} className="input" placeholder="Bonjour, est-ce que c'est toujours disponible ?" />
      <Feedback state={state} />
      <button className="btn" disabled={pending}><Send size={15} /> {pending ? "Envoi…" : "Envoyer le message"}</button>
    </form>
  );
}

/** Zone de réponse d'une conversation. */
export function MessageComposer({ conversationId }: { conversationId: number }) {
  const [state, action, pending] = useActionState(sendMessage, undefined);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={async (fd) => { await action(fd); form.current?.reset(); window.dispatchEvent(new Event("conv-sync")); }} className="space-y-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <textarea name="body" required rows={2} maxLength={2000} onKeyDown={submitOnCtrlEnter} className="input" placeholder="Ton message… (Ctrl + Entrée pour envoyer)" aria-label="Ton message" />
      {state?.error && <Feedback state={state} />}
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
