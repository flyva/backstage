"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { companyContacts, companyInterviews } from "@/db/schema";
import { addContact, addInterview, deleteContact, deleteInterview, saveSearchField } from "@/lib/company-search-actions";
import { KIND_LABEL, PRIORITY_LABEL, type CompanyKind, type CompanyPriority } from "@/lib/company-search";
import type { CompanyStatusDef } from "@/lib/company-status";
import type { FormState } from "@/lib/actions";
import { ConfirmButton } from "@/components/ConfirmButton";

const CONTACT_TYPE_LABEL = { appel: "Appel", mail: "Mail", physique: "Visite" } as const;

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

/** Champs de suivi édités un par un (auto-soumission au changement), même mécanique que le tableau. */
export function SearchFieldsForm({ searchId, status, priority, kind, lastContactDate, delayDays, note, statuses }: {
  searchId: number; status: string | null; priority: CompanyPriority | null; kind: CompanyKind | null;
  lastContactDate: string | null; delayDays: number | null; note: string; statuses: CompanyStatusDef[];
}) {
  const [noteValue, setNoteValue] = useState(note);
  const field = (name: string, value: string) => {
    const fd = new FormData();
    fd.set("id", String(searchId));
    fd.set("field", name);
    fd.set("value", value);
    return fd;
  };
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <label className="label" htmlFor="df-kind">Offre / spontanée</label>
        <select id="df-kind" defaultValue={kind ?? ""} className="input" onChange={(e) => saveSearchField(field("kind", e.target.value))}>
          <option value="">—</option>
          {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="df-priority">Priorité</label>
        <select id="df-priority" defaultValue={priority ?? ""} className="input" onChange={(e) => saveSearchField(field("priority", e.target.value))}>
          <option value="">—</option>
          {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor="df-status">Statut</label>
        <select id="df-status" defaultValue={status ?? ""} className="input" onChange={(e) => saveSearchField(field("status", e.target.value))}>
          <option value="">—</option>
          {statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="df-last">Dernier contact</label>
        <input id="df-last" type="date" defaultValue={lastContactDate ?? ""} className="input" onChange={(e) => saveSearchField(field("lastContactDate", e.target.value))} />
      </div>
      <div>
        <label className="label" htmlFor="df-delay">Délais (j)</label>
        <input id="df-delay" type="number" min={0} defaultValue={delayDays ?? ""} className="input" onChange={(e) => saveSearchField(field("delayDays", e.target.value))} />
      </div>
      <div className="col-span-2">
        <label className="label" htmlFor="df-note">Observation</label>
        <div className="flex items-center gap-2">
          <input id="df-note" value={noteValue} onChange={(e) => setNoteValue(e.target.value)} className="input flex-1" />
          {noteValue !== note && <button type="button" onClick={() => saveSearchField(field("note", noteValue))} className="btn-ghost shrink-0 px-2 py-1.5 text-xs">OK</button>}
        </div>
      </div>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });
const fmtDate = (d: string) => dateFmt.format(new Date(`${d}T12:00:00`));

type Interview = InferSelectModel<typeof companyInterviews>;

export function InterviewList({ searchId, interviews }: { searchId: number; interviews: Interview[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addInterview, undefined);
  return (
    <div className="space-y-3">
      {interviews.length === 0 && !open && <p className="text-sm text-muted">Aucun entretien pour l&apos;instant.</p>}
      {interviews.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {interviews.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5">
              <span>{fmtDate(it.interviewDate)}{it.note ? ` — ${it.note}` : ""}</span>
              <form action={deleteInterview}>
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="searchId" value={searchId} />
                <ConfirmButton message="Supprimer cet entretien ?" className="rounded-lg p-1 text-muted hover:bg-bg hover:text-danger">
                  <Trash2 size={13} aria-label="Supprimer" />
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <form action={action} className="space-y-2 rounded-lg border border-line p-2.5">
          <input type="hidden" name="searchId" value={searchId} />
          <div className="flex gap-2">
            <input name="interviewDate" type="date" required className="input flex-1" />
            <input name="note" placeholder="Note (facultatif)" maxLength={255} className="input flex-[2]" />
          </div>
          <div className="flex items-center gap-2">
            <button className="btn text-sm" disabled={pending}>{pending ? "…" : "Ajouter"}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Annuler</button>
            <Feedback state={state} />
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost text-sm"><Plus size={14} /> Ajouter un entretien</button>
      )}
    </div>
  );
}

type Contact = InferSelectModel<typeof companyContacts>;

export function ContactHistory({ searchId, contacts }: { searchId: number; contacts: Contact[] }) {
  const [state, action, pending] = useActionState(addContact, undefined);
  return (
    <div className="space-y-3">
      {contacts.length === 0 ? (
        <p className="text-sm text-muted">Aucun contact enregistré pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-lg border border-line p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{CONTACT_TYPE_LABEL[c.type]} · {fmtDate(c.contactDate)}</p>
                <form action={deleteContact}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="searchId" value={searchId} />
                  <ConfirmButton message="Supprimer ce contact ?" className="rounded-lg p-1 text-muted hover:bg-bg hover:text-danger">
                    <Trash2 size={13} aria-label="Supprimer" />
                  </ConfirmButton>
                </form>
              </div>
              {c.comment && <p className="mt-0.5 whitespace-pre-wrap text-muted">{c.comment}</p>}
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="space-y-2 rounded-lg border border-line p-2.5">
        <input type="hidden" name="searchId" value={searchId} />
        <div className="flex gap-2">
          <select name="type" defaultValue="appel" className="input w-32 shrink-0">
            <option value="appel">Appel</option>
            <option value="mail">Mail</option>
            <option value="physique">Visite</option>
          </select>
          <input name="contactDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input flex-1" />
        </div>
        <textarea name="comment" placeholder="Commentaire (ce qui a été dit, prochaine étape…)" rows={2} maxLength={2000} className="input w-full" />
        <div className="flex items-center gap-2">
          <button className="btn text-sm" disabled={pending}><Plus size={14} /> {pending ? "…" : "Ajouter un contact"}</button>
          <Feedback state={state} />
        </div>
      </form>
    </div>
  );
}
