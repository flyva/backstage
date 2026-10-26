"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Phone, Plus, Trash2 } from "lucide-react";
import { removeFromBoard, saveSearchField } from "@/lib/company-search-actions";
import {
  KIND_LABEL, PRIORITY_LABEL, STATUS_CLASS, STATUS_LABEL, STATUS_ORDER,
  type CompanyKind, type CompanyPriority, type CompanyStatus,
} from "@/lib/company-search";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TypeBadges } from "@/components/TypeBadges";

export type BoardRow = {
  searchId: number; companyId: number; name: string; city: string; sector: string; types: string; address: string;
  contactName: string; phone: string; email: string;
  kind: CompanyKind | null; status: CompanyStatus | null; priority: CompanyPriority | null;
  lastContactDate: string | null; interviewDate: string | null; delayDays: number | null; note: string;
};

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

export function MyBoardTable({ board }: { board: BoardRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return board;
    return board.filter((r) => `${r.name} ${r.city} ${r.sector}`.toLowerCase().includes(s));
  }, [board, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, ville, secteur)…" className="input max-w-xs flex-1" />
        <Link href="/recherche-entreprises/annuaire" className="btn-ghost text-sm"><Plus size={15} /> Ajouter depuis l&apos;annuaire</Link>
      </div>

      <div className="card overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            {board.length === 0 ? (
              <>Ton tableau est vide. <Link href="/recherche-entreprises/annuaire" className="text-accent underline">Ajoute des entreprises depuis l&apos;annuaire</Link>, importe ton CSV, ou crée-en une nouvelle.</>
            ) : "Aucun résultat."}
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
              {filtered.map((r) => (
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
    </div>
  );
}
