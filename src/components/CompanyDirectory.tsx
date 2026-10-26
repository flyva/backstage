"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { FileUp, Mail, MapPin, Phone, Plus, Search, Trash2, X } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { addToBoard, createCompany, deleteCompany, importCompaniesCsv, removeFromBoard, searchCompaniesByQuery } from "@/lib/company-search-actions";
import { TYPE_LABEL, TYPE_ORDER, type CompanyMatch } from "@/lib/company-search";
import { TypeBadges } from "@/components/TypeBadges";
import { ConfirmButton } from "@/components/ConfirmButton";

export type DirectoryRow = {
  id: number; name: string; city: string; department: string; sector: string; types: string; address: string;
  salary: string; sources: string; perks: string;
  contactTitle: string; contactName: string; phone: string; email: string; inBoard: boolean; canDelete: boolean;
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
  const addFormRef = useRef<HTMLFormElement>(null);
  const [importState, importAction, importPending] = useActionState(importCompaniesCsv, undefined);
  const [addState, addAction, addPending] = useActionState(createCompany, undefined);

  const [lookup, setLookup] = useState("");
  const [matches, setMatches] = useState<CompanyMatch[]>([]);
  const [matchedId, setMatchedId] = useState<number | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLookupChange = (value: string) => {
    setLookup(value);
    setMatchedId(null);
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (value.trim().length < 2) { setMatches([]); return; }
    lookupTimer.current = setTimeout(async () => setMatches(await searchCompaniesByQuery(value)), 300);
  };
  const applyMatch = (c: CompanyMatch) => {
    setMatchedId(c.id);
    setLookup(c.name);
    setMatches([]);
    const f = addFormRef.current;
    if (!f) return;
    const set = (name: string, value: string) => { const el = f.elements.namedItem(name) as HTMLInputElement | null; if (el) el.value = value; };
    set("name", c.name); set("city", c.city); set("sector", c.sector); set("contactTitle", c.contactTitle);
    set("contactName", c.contactName); set("phone", c.phone); set("email", c.email);
    for (const t of TYPE_ORDER) { const el = f.elements.namedItem(`type_${t}`) as HTMLInputElement | null; if (el) el.checked = c.types.includes(t); }
  };

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
        <form ref={addFormRef} action={addAction} className="card grid gap-3 sm:grid-cols-2">
          <div className="relative sm:col-span-2">
            <label className="label" htmlFor="ca-lookup">Chercher une entreprise déjà connue (nom, téléphone, email)</label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input id="ca-lookup" value={lookup} onChange={(e) => onLookupChange(e.target.value)} placeholder="Tape pour chercher…" className="input pl-8" autoComplete="off" />
            </div>
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => applyMatch(c)} className="block w-full px-3 py-2 text-left text-sm hover:bg-bg">
                      <span className="font-medium">{c.name}</span> {c.city && <span className="text-muted">· {c.city}</span>}
                      {(c.phone || c.email) && <span className="block text-xs text-muted">{[c.phone, c.email].filter(Boolean).join(" · ")}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {matchedId && <p className="mt-1 text-xs text-green-600 dark:text-green-400">Champs remplis depuis l&apos;annuaire — modifie-les si besoin avant d&apos;ajouter.</p>}
          </div>
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
          <li key={c.id} className="card p-0">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-3 marker:hidden">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name} {c.city && <span className="font-normal text-muted">· {c.city}</span>}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {c.sector}
                    <TypeBadges types={c.types} />
                  </p>
                </div>
                {c.inBoard ? (
                  <form action={removeFromBoard} onClick={(e) => e.stopPropagation()}>
                    <input type="hidden" name="companyId" value={c.id} />
                    <button className="btn-ghost text-xs text-danger"><X size={13} /> Retirer de mon tableau</button>
                  </form>
                ) : (
                  <form action={addToBoard} onClick={(e) => e.stopPropagation()}>
                    <input type="hidden" name="companyId" value={c.id} />
                    <button className="btn-ghost text-xs"><Plus size={13} /> Ajouter à mon tableau</button>
                  </form>
                )}
              </summary>
              {(c.address || c.contactTitle || c.contactName || c.phone || c.email || c.salary || c.sources || c.perks || c.canDelete) && (
                <div className="space-y-1.5 border-t border-line p-3 text-sm">
                  {c.address && <p className="flex items-start gap-1.5 text-muted"><MapPin size={14} className="mt-0.5 shrink-0" /> {c.address}</p>}
                  {(c.contactTitle || c.contactName) && <p>{c.contactTitle && <span className="text-muted">{c.contactTitle} · </span>}{c.contactName}</p>}
                  {c.phone && <p className="flex items-center gap-1.5 text-muted"><Phone size={14} className="shrink-0" /> {c.phone}</p>}
                  {c.email && <p className="flex items-center gap-1.5 text-muted"><Mail size={14} className="shrink-0" /> {c.email}</p>}
                  {c.salary && <p><span className="text-muted">Salaire : </span>{c.salary}</p>}
                  {c.perks && <p><span className="text-muted">Avantages : </span>{c.perks}</p>}
                  {c.sources && <p><span className="text-muted">Source : </span>{c.sources}</p>}
                  {c.canDelete && (
                    <form action={deleteCompany} className="pt-1">
                      <input type="hidden" name="companyId" value={c.id} />
                      <ConfirmButton
                        message="Supprimer définitivement cette entreprise de l'annuaire ? Elle disparaîtra aussi du tableau de tous ceux qui l'ont ajoutée."
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-danger"
                      >
                        <Trash2 size={13} /> Supprimer de l&apos;annuaire
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              )}
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
