"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { FileUp, Phone, Plus, Trash2, X } from "lucide-react";
import type { FormState } from "@/lib/actions";
import { addToBoard, createCompany, importCompaniesCsv, removeFromBoard, saveSearchField } from "@/lib/company-search-actions";
import {
  KIND_LABEL, PRIORITY_LABEL, STATUS_CLASS, STATUS_LABEL, STATUS_ORDER, TYPE_LABEL, TYPE_ORDER,
  type CompanyKind, type CompanyPriority, type CompanyStatus, type CompanyType,
} from "@/lib/company-search";
import { ConfirmButton } from "@/components/ConfirmButton";

export type BoardRow = {
  searchId: number; companyId: number; name: string; city: string; sector: string; types: string; address: string;
  contactName: string; phone: string; email: string;
  kind: CompanyKind | null; status: CompanyStatus | null; priority: CompanyPriority | null;
  lastContactDate: string | null; interviewDate: string | null; delayDays: number | null; note: string;
};
export type DirectoryRow = {
  id: number; name: string; city: string; department: string; sector: string; types: string; address: string;
  contactName: string; phone: string; email: string; inBoard: boolean;
};

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

function TypeBadges({ types }: { types: string }) {
  const list = types.split(",").filter(Boolean) as CompanyType[];
  if (list.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((t) => <span key={t} className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium">{TYPE_LABEL[t]}</span>)}
    </span>
  );
}

/** Cellule éditable : un <select> ou <input> qui s'auto-soumet au changement (une ligne de suivi = un formulaire par champ). */
function EditCell({ searchId, field, value, type, options }: {
  searchId: number; field: string; value: string; type: "select" | "date" | "number"; options?: { value: string; label: string }[];
}) {
  return (
    <form action={saveSearchField}>
      <input type="hidden" name="id" value={searchId} />
      <input type="hidden" name="field" value={field} />
      {type === "select" ? (
        <select name="value" defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input py-1 text-xs">
          <option value="">—</option>
          {options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          name="value" type={type} defaultValue={value}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="input w-full py-1 text-xs"
        />
      )}
    </form>
  );
}

function NoteCell({ searchId, value }: { searchId: number; value: string }) {
  const [v, setV] = useState(value);
  const dirty = v !== value;
  return (
    <form action={saveSearchField} className="flex items-center gap-1">
      <input type="hidden" name="id" value={searchId} />
      <input type="hidden" name="field" value="note" />
      <input name="value" value={v} onChange={(e) => setV(e.target.value)} placeholder="Observation…" className="input w-40 py-1 text-xs" />
      {dirty && <button type="submit" className="btn-ghost shrink-0 px-1.5 py-1 text-xs">OK</button>}
    </form>
  );
}

export function CompanyBoard({ board, directory }: { board: BoardRow[]; directory: DirectoryRow[] }) {
  const [tab, setTab] = useState<"mine" | "annuaire">("mine");
  const [q, setQ] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importState, importAction, importPending] = useActionState(importCompaniesCsv, undefined);
  const [addState, addAction, addPending] = useActionState(createCompany, undefined);

  const filteredBoard = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return board;
    return board.filter((r) => `${r.name} ${r.city} ${r.sector}`.toLowerCase().includes(s));
  }, [board, q]);
  const filteredDirectory = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? directory.filter((r) => `${r.name} ${r.city} ${r.sector}`.toLowerCase().includes(s)) : directory;
    return base;
  }, [directory, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line p-0.5">
          <button type="button" onClick={() => setTab("mine")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "mine" ? "bg-accent text-accent-fg" : "text-muted"}`}>
            Mon tableau ({board.length})
          </button>
          <button type="button" onClick={() => setTab("annuaire")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "annuaire" ? "bg-accent text-accent-fg" : "text-muted"}`}>
            Annuaire ({directory.length})
          </button>
        </div>
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

      {tab === "mine" && (
        <div className="card overflow-x-auto p-0">
          {filteredBoard.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              {board.length === 0 ? "Ton tableau est vide. Ajoute des entreprises depuis l'annuaire, importe ton CSV, ou crée-en une nouvelle." : "Aucun résultat."}
            </p>
          ) : (
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="p-2 font-medium">Entreprise</th>
                  <th className="p-2 font-medium">Secteur / Type</th>
                  <th className="p-2 font-medium">Contact</th>
                  <th className="p-2 font-medium">Offre</th>
                  <th className="p-2 font-medium">Statut</th>
                  <th className="p-2 font-medium">Priorité</th>
                  <th className="p-2 font-medium">Dernier contact</th>
                  <th className="p-2 font-medium">Entretien</th>
                  <th className="p-2 font-medium">Délais (j)</th>
                  <th className="p-2 font-medium">Observation</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredBoard.map((r) => (
                  <tr key={r.searchId} className="border-b border-line last:border-0 align-top">
                    <td className="p-2">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted">{r.city}</p>
                    </td>
                    <td className="p-2">
                      <p className="text-xs">{r.sector}</p>
                      <TypeBadges types={r.types} />
                    </td>
                    <td className="p-2 text-xs">
                      {r.contactName && <p>{r.contactName}</p>}
                      {r.phone && <p className="flex items-center gap-1 text-muted"><Phone size={11} /> {r.phone}</p>}
                      {r.email && <p className="truncate text-muted" title={r.email}>{r.email}</p>}
                    </td>
                    <td className="p-2"><EditCell searchId={r.searchId} field="kind" value={r.kind ?? ""} type="select" options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))} /></td>
                    <td className="p-2">
                      <EditCell searchId={r.searchId} field="status" value={r.status ?? ""} type="select" options={STATUS_ORDER.map((value) => ({ value, label: STATUS_LABEL[value] }))} />
                      {r.status && <span className={`mt-1 block w-fit rounded-full px-1.5 py-0.5 text-[10px] ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>}
                    </td>
                    <td className="p-2"><EditCell searchId={r.searchId} field="priority" value={r.priority ?? ""} type="select" options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))} /></td>
                    <td className="p-2"><EditCell searchId={r.searchId} field="lastContactDate" value={r.lastContactDate ?? ""} type="date" /></td>
                    <td className="p-2"><EditCell searchId={r.searchId} field="interviewDate" value={r.interviewDate ?? ""} type="date" /></td>
                    <td className="p-2"><EditCell searchId={r.searchId} field="delayDays" value={r.delayDays?.toString() ?? ""} type="number" /></td>
                    <td className="p-2"><NoteCell searchId={r.searchId} value={r.note} /></td>
                    <td className="p-2">
                      <form action={removeFromBoard}>
                        <input type="hidden" name="companyId" value={r.companyId} />
                        <ConfirmButton message="Retirer cette entreprise de ton tableau ?" className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-danger">
                          <Trash2 size={14} aria-label="Retirer" />
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "annuaire" && (
        <ul className="space-y-2">
          {filteredDirectory.length === 0 && <li className="card text-sm text-muted">Aucun résultat.</li>}
          {filteredDirectory.map((c) => (
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
      )}
    </div>
  );
}
