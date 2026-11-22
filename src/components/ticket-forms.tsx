"use client";

import { useActionState } from "react";
import { Paperclip, Send } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { addTicketComment, createTicket, setTicketStatus } from "@/lib/ticket-actions";
import { type TicketStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/ticket-shared";
import { MarkdownField } from "@/components/MarkdownField";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

export function TicketCreateForm() {
  const [state, action, pending] = useActionState(createTicket, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="tt">Titre</label>
        <input id="tt" name="title" required minLength={3} maxLength={150} className="input" placeholder="Micro HF ne s'allume plus…" />
      </div>
      <MarkdownField name="body" rows={6} maxLength={5000} uploadUrl="/api/wiki/files" label="Description" placeholder="Décris le problème, ce que tu as déjà essayé, depuis quand…" />
      <div>
        <label className="label" htmlFor="tf">Captures d&apos;écran ou fichiers (facultatif, 5 maximum, 15 Mo chacun)</label>
        <input id="tf" name="files" type="file" multiple accept="image/png,image/jpeg,application/pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}><Paperclip size={15} /> {pending ? "Envoi…" : "Créer le ticket"}</button>
    </form>
  );
}

export function TicketCommentForm({ ticketId }: { ticketId: number }) {
  const [state, action, pending] = useActionState(addTicketComment, undefined);
  return (
    <form action={action} key={state?.ok ? "done" : "open"} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <MarkdownField name="body" rows={3} maxLength={5000} uploadUrl="/api/wiki/files" placeholder="Ajouter un suivi, une précision, une réponse…" />
      <div>
        <label className="label" htmlFor={`tcf-${ticketId}`}>Joindre d&apos;autres fichiers (facultatif, 5 maximum, 15 Mo chacun)</label>
        <input id={`tcf-${ticketId}`} name="files" type="file" multiple accept="image/png,image/jpeg,application/pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn-ghost text-sm" disabled={pending}><Send size={14} /> {pending ? "Envoi…" : "Envoyer"}</button>
    </form>
  );
}

export function TicketStatusForm({ ticketId, status }: { ticketId: number; status: TicketStatus }) {
  return (
    <form action={setTicketStatus} className="flex items-center gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="label" htmlFor="ts">Statut</label>
      <select id="ts" name="status" defaultValue={status} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input w-auto">
        {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
    </form>
  );
}
