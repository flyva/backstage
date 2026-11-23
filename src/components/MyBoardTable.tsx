"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckSquare, Globe, Info, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { publishCompanies, removeFromBoard } from "@/lib/company-search-actions";
import { type CompanyKind, type CompanyPriority } from "@/lib/company-search";
import { STATUS_BADGE_CLASS, STATUS_ROW_CLASS, type CompanyStatusDef } from "@/lib/company-status";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TypeBadges } from "@/components/TypeBadges";

export type BoardRow = {
  searchId: number; companyId: number; name: string; city: string; sector: string; types: string; address: string;
  contactName: string; phone: string; email: string;
  kind: CompanyKind | null; status: string | null; priority: CompanyPriority | null;
  lastContactDate: string | null; nextInterviewDate: string | null; interviewCount: number; delayDays: number | null; note: string;
  published: boolean; canPublish: boolean; overdue: boolean;
};

export function MyBoardTable({ board, statuses }: { board: BoardRow[]; statuses: CompanyStatusDef[] }) {
  const statusByKey = new Map(statuses.map((s) => [s.key, s]));
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return board;
    return board.filter((r) => `${r.name} ${r.city} ${r.sector}`.toLowerCase().includes(s));
  }, [board, q]);

  const toggleSelected = (companyId: number, checked: boolean) => setSelected((cur) => {
    const next = new Set(cur);
    if (checked) next.add(companyId); else next.delete(companyId);
    return next;
  });
  const publishSelected = async () => {
    setPublishing(true);
    await publishCompanies([...selected]);
    setSelected(new Set());
    setPublishing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, ville, secteur)…" className="input max-w-xs flex-1" />
        <Link href="/recherche-entreprises/annuaire" className="btn-ghost text-sm"><Plus size={15} /> Ajouter</Link>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex items-center gap-3 rounded-xl border border-accent bg-surface p-3 shadow-lg">
          <CheckSquare size={16} className="text-accent" />
          <p className="flex-1 text-sm">{selected.size} entreprise{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}</p>
          <button type="button" onClick={() => setSelected(new Set())} className="btn-ghost text-xs">Annuler</button>
          <button type="button" onClick={publishSelected} disabled={publishing} className="btn text-sm"><Globe size={14} /> {publishing ? "Publication…" : "Publier dans l'annuaire"}</button>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            {board.length === 0 ? (
              <>Ton tableau est vide. <Link href="/recherche-entreprises/annuaire" className="text-accent underline">Ajoute des entreprises depuis l&apos;annuaire</Link>, importe ton CSV, ou crée-en une nouvelle.</>
            ) : "Aucun résultat."}
          </p>
        ) : (
          <table className="w-full min-w-[1000px] text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="p-2 font-medium">Entreprise</th>
                <th className="p-2 font-medium">Domaine</th>
                <th className="p-2 font-medium">Contact</th>
                <th className="p-2 font-medium">Statut</th>
                <th className="p-2 font-medium">Dernier contact</th>
                <th className="p-2 font-medium">Entretien</th>
                <th className="p-2 font-medium">Observation</th>
                <th className="p-2 font-medium">Annuaire</th>
                <th className="p-2"></th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const statusDef = r.status ? statusByKey.get(r.status) : undefined;
                const rowClass = r.overdue ? "bg-danger/20" : statusDef ? STATUS_ROW_CLASS[statusDef.color] : "";
                return (
                <tr key={r.searchId} className={`border-b border-line last:border-0 align-top ${rowClass}`}>
                  <td className="p-2">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted">{r.city}</p>
                    {r.overdue && <p className="flex items-center gap-1 text-xs font-medium text-danger"><AlertTriangle size={12} /> En retard</p>}
                  </td>
                  <td className="p-2">
                    <p className="text-xs">{r.sector}</p>
                    <TypeBadges types={r.types} />
                  </td>
                  <td className="p-2 text-xs">
                    {r.contactName && <p className="truncate">{r.contactName}</p>}
                    {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1 truncate text-muted underline hover:text-accent"><Phone size={11} className="shrink-0" /> {r.phone}</a>}
                    {r.email && <a href={`mailto:${r.email.split(";")[0]}`} className="flex items-center gap-1 truncate text-muted underline hover:text-accent" title={r.email}><Mail size={11} className="shrink-0" /> {r.email}</a>}
                  </td>
                  <td className="p-2">
                    {statusDef ? (
                      <span className={`inline-block w-fit rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[statusDef.color]}`}>{statusDef.label}</span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="p-2 text-xs">{r.lastContactDate ? new Date(`${r.lastContactDate}T12:00:00`).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="p-2 text-xs">
                    <Link href={`/recherche-entreprises/suivi/${r.searchId}`} className="text-accent underline">
                      {r.interviewCount === 0 ? "Aucun" : `${r.interviewCount} · ${r.nextInterviewDate ? new Date(`${r.nextInterviewDate}T12:00:00`).toLocaleDateString("fr-FR") : ""}`}
                    </Link>
                    {r.overdue && <p className="mt-0.5 text-[10px] text-danger">Relance dépassée</p>}
                  </td>
                  <td className="p-2 text-xs text-muted"><p className="line-clamp-2">{r.note || "—"}</p></td>
                  <td className="p-2">
                    {r.published ? (
                      <span className="text-xs text-muted">Publiée</span>
                    ) : r.canPublish ? (
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        <input
                          type="checkbox" checked={selected.has(r.companyId)}
                          onChange={(e) => toggleSelected(r.companyId, e.target.checked)}
                          className="size-4 accent-[var(--accent)]"
                        />
                        Publier
                      </label>
                    ) : (
                      <span className="text-xs text-muted">Pas encore publiée</span>
                    )}
                  </td>
                  <td className="p-2">
                    <Link href={`/recherche-entreprises/suivi/${r.searchId}`} className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-accent" title="Modifier (statut, priorité, type d'offre, délais, observation, entretiens, historique de contact)">
                      <Info size={14} aria-label="Détails" />
                    </Link>
                  </td>
                  <td className="p-2">
                    <form action={removeFromBoard}>
                      <input type="hidden" name="companyId" value={r.companyId} />
                      <ConfirmButton message="Retirer cette entreprise de ton tableau ?" className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-danger">
                        <Trash2 size={14} aria-label="Retirer" />
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
