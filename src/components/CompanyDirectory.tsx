"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { FileUp, Plus, X } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { addToBoard, createCompany, importCompaniesCsv, removeFromBoard } from "@/lib/company-search-actions";
import { TYPE_LABEL, TYPE_ORDER } from "@/lib/company-search";
import { TypeBadges } from "@/components/TypeBadges";

export type DirectoryRow = {
  id: number; name: string; city: string; department: string; sector: string; types: string; address: string;
  contactName: string; phone: string; email: string; inBoard: boolean;
};

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export function CompanyDirectory({ directory }: { directory: DirectoryRow[] }) {
  const [q, setQ] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importState, importAction, importPending] = useActionState(importCompaniesCsv, undefined);
  const [addState, addAction, addPending] = useActionState(createCompany, undefined);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return directory;
    return directory.filter((r) => `${r.name} ${r.city} ${r.sector}`.toLowerCase().includes(s));
  }, [directory, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, ville, secteur)…" className="input max-w-xs flex-1" />
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="btn-ghost text-sm"><Plus size={15} /> Ajouter une entreprise</button>
        <button type="button" onClick={() => setShowImport((v) => !v)} className="btn-ghost text-sm"><FileUp size={15} /> Importer un CSV</button>
      </div>

      {showImport && (
        <form action={importAction} className="card space-y-2">
          <p className="text-sm font-medium">Importer un CSV (colonnes du tableur de recherche d&apos;alternance)</p>
          <p className="text-xs text-muted">
            Les entreprises rejoignent l&apos;annuaire partagé (sans doublon par nom + ville) ; le statut, la priorité et le reste du suivi vont dans <strong>ton</strong> tableau uniquement.
          </p>
          <input ref={fileRef} name="file" type="file" accept=".csv,text/csv" required className="input" />
          <div className="flex items-center gap-3">
            <button className="btn" disabled={importPending}>{importPending ? "Import…" : "Importer"}</button>
            <Feedback state={importState} />
          </div>
        </form>
      )}

      {showAdd && (
        <form action={addAction} className="card grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="ca-name">Nom de l&apos;entreprise</label><input id="ca-name" name="name" required maxLength={200} className="input" /></div>
          <div><label className="label" htmlFor="ca-city">Ville</label><input id="ca-city" name="city" maxLength={120} className="input" /></div>
          <div><label className="label" htmlFor="ca-sector">Secteur</label><input id="ca-sector" name="sector" maxLength={150} placeholder="Prestation, Parc d'attraction…" className="input" /></div>
          <div>
            <label className="label">Type</label>
            <div className="flex gap-3 pt-1.5 text-sm">
              {TYPE_ORDER.map((t) => <label key={t} className="flex items-center gap-1.5"><input type="checkbox" name={`type_${t}`} className="size-4 accent-[var(--accent)]" /> {TYPE_LABEL[t]}</label>)}
            </div>
          </div>
          <div><label className="label" htmlFor="ca-contact">Contact</label><input id="ca-contact" name="contactName" maxLength={150} className="input" /></div>
          <div><label className="label" htmlFor="ca-phone">Téléphone</label><input id="ca-phone" name="phone" maxLength={60} className="input" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ca-email">Email</label><input id="ca-email" name="email" type="email" maxLength={300} className="input" /></div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className="btn" disabled={addPending}>{addPending ? "…" : "Ajouter"}</button>
            <Feedback state={addState} />
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {filtered.length === 0 && <li className="card text-sm text-muted">Aucun résultat.</li>}
        {filtered.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.name} {c.city && <span className="font-normal text-muted">· {c.city}</span>}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {c.sector}
                <TypeBadges types={c.types} />
              </p>
            </div>
            {c.inBoard ? (
              <form action={removeFromBoard}>
                <input type="hidden" name="companyId" value={c.id} />
                <button className="btn-ghost text-xs text-danger"><X size={13} /> Retirer de mon tableau</button>
              </form>
            ) : (
              <form action={addToBoard}>
                <input type="hidden" name="companyId" value={c.id} />
                <button className="btn-ghost text-xs"><Plus size={13} /> Ajouter à mon tableau</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
