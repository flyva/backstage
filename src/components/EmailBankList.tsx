"use client";

import { useActionState, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { createEmailBankEntry, deleteEmailBankEntry } from "@/lib/email-bank-actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export type EmailBankRow = { id: number; label: string; email: string; category: string; note: string; canDelete: boolean };

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-accent"
      title="Copier l'email"
    >
      {copied ? <span className="text-xs text-accent">Copié</span> : <Copy size={14} aria-label="Copier" />}
    </button>
  );
}

export function EmailBankList({ entries }: { entries: EmailBankRow[] }) {
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addState, addAction, addPending] = useActionState(createEmailBankEntry, undefined);

  const categories = useMemo(() => [...new Set(entries.map((e) => e.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [entries]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((e) => `${e.label} ${e.email} ${e.category} ${e.note}`.toLowerCase().includes(s));
  }, [entries, q]);
  const sorted = [...filtered].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, email, catégorie)…" className="input max-w-xs flex-1" />
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => setQ(c)} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-accent">{c}</button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="btn-ghost text-sm"><Plus size={15} /> Ajouter un contact</button>
      </div>

      {showAdd && (
        <form action={addAction} className="card grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="eb-label">Nom</label><input id="eb-label" name="label" required maxLength={150} placeholder="Ex. RH — Nom Entreprise" className="input" /></div>
          <div><label className="label" htmlFor="eb-email">Email</label><input id="eb-email" name="email" type="email" required className="input" /></div>
          <div><label className="label" htmlFor="eb-category">Catégorie (facultatif)</label><input id="eb-category" name="category" maxLength={80} placeholder="Ex. RH, Casting, Prod…" className="input" /></div>
          <div><label className="label" htmlFor="eb-note">Note (facultatif)</label><input id="eb-note" name="note" maxLength={300} className="input" /></div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className="btn" disabled={addPending}>{addPending ? "…" : "Ajouter"}</button>
            <Feedback state={addState} />
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {sorted.length === 0 && <li className="card text-sm text-muted">{entries.length === 0 ? "Rien pour l'instant. Ajoute le premier contact !" : "Aucun résultat."}</li>}
        {sorted.map((e) => (
          <li key={e.id} className="card flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-medium">
                {e.label}
                {e.category && <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium">{e.category}</span>}
              </p>
              <p className="truncate text-sm text-muted">{e.email}</p>
              {e.note && <p className="text-xs text-muted">{e.note}</p>}
            </div>
            <CopyEmailButton email={e.email} />
            {e.canDelete && (
              <form action={deleteEmailBankEntry} className="shrink-0">
                <input type="hidden" name="id" value={e.id} />
                <ConfirmButton message="Supprimer ce contact de la banque partagée ?" className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-danger">
                  <Trash2 size={14} aria-label="Supprimer" />
                </ConfirmButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
