"use client";

import { useActionState, useMemo, useState } from "react";
import type { FormState } from "@/lib/actions";
import type { FinanceCategory, FinanceDirection } from "@/db/schema";
import { CATEGORY_LABEL, DIRECTION_LABEL, fmtEuros } from "@/lib/finance";
import { isDay } from "@/lib/alternance";
import { parseCsv } from "@/lib/csv";
import {
  confirmFinancialEntriesImport, saveAccountingAccount, saveBankAccount, saveBudgetForecast,
  saveFinancialEntry, saveFiscalYear,
} from "@/lib/finance-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export type FinanceEntryValues = {
  id?: number;
  direction?: FinanceDirection;
  category?: FinanceCategory;
  accountingAccountId?: number | null;
  bankAccountId?: number | null;
  fiscalYearId?: number | null;
  label?: string;
  amount?: number; // en euros
  occurredOn?: string;
  method?: string;
  reference?: string;
  invoiceUrl?: string;
  notes?: string;
};

type AccountOption = { id: number; number: string; nameArranged: string };
type BankAccountOption = { id: number; name: string };
type FiscalYearOption = { id: number; label: string };

/** Mêmes champs que le formulaire « Nouvelle écriture » d'Oasis, sans le champ Association (un seul BDE ici),
 *  complétés par le compte bancaire, le compte comptable et l'exercice de rattachement. */
export function FinanceEntryForm({
  today, accountingAccounts, bankAccounts, fiscalYears, ...entry
}: FinanceEntryValues & { today: string; accountingAccounts: AccountOption[]; bankAccounts: BankAccountOption[]; fiscalYears: FiscalYearOption[] }) {
  const [state, action, pending] = useActionState(saveFinancialEntry, undefined);
  return (
    <form action={action} className="space-y-4">
      {entry.id && <input type="hidden" name="id" value={entry.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="fe-direction">Sens</label>
          <select id="fe-direction" name="direction" defaultValue={entry.direction ?? "expense"} className="input">
            {(Object.keys(DIRECTION_LABEL) as FinanceDirection[]).map((d) => <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fe-amount">Montant (€)</label>
          <input id="fe-amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={entry.amount} placeholder="0.00" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="fe-date">Date</label>
          <input id="fe-date" name="occurredOn" type="date" required defaultValue={entry.occurredOn ?? today} max={today} className="input" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fe-label">Libellé</label>
        <input id="fe-label" name="label" required maxLength={200} defaultValue={entry.label} className="input" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fe-category">Poste analytique</label>
          <select id="fe-category" name="category" defaultValue={entry.category ?? "autre"} className="input">
            {(Object.keys(CATEGORY_LABEL) as FinanceCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fe-account">Compte comptable</label>
          <select id="fe-account" name="accountingAccountId" defaultValue={entry.accountingAccountId ?? ""} className="input">
            <option value="">— Non classé —</option>
            {accountingAccounts.map((a) => <option key={a.id} value={a.id}>{a.number} — {a.nameArranged}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fe-bank">Compte bancaire</label>
          <select id="fe-bank" name="bankAccountId" defaultValue={entry.bankAccountId ?? ""} className="input">
            <option value="">— Compte par défaut —</option>
            {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fe-fy">Exercice</label>
          <select id="fe-fy" name="fiscalYearId" defaultValue={entry.fiscalYearId ?? ""} className="input">
            <option value="">— Exercice en cours —</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fe-method">Moyen de paiement (facultatif)</label>
          <input id="fe-method" name="method" maxLength={40} defaultValue={entry.method} placeholder="Virement, CB, chèque, espèces…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="fe-reference">Référence / pièce (facultatif)</label>
          <input id="fe-reference" name="reference" maxLength={120} defaultValue={entry.reference} placeholder="N° facture, chèque…" className="input" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="fe-invoice">Lien de la pièce (Drive…, facultatif)</label>
        <input id="fe-invoice" name="invoiceUrl" type="url" maxLength={500} defaultValue={entry.invoiceUrl} placeholder="https://drive.google.com/…" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="fe-notes">Notes (facultatif)</label>
        <textarea id="fe-notes" name="notes" rows={2} maxLength={2000} defaultValue={entry.notes} className="input" />
      </div>

      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

/** Formulaire compte bancaire (paramètres comptabilité → Général) : nom, banque, solde actuel, date de MAJ. */
export function BankAccountForm({ id, name = "", bankName = "", balance, balanceUpdatedAt = "", isDefault = false, today }: { id?: number; name?: string; bankName?: string; balance?: number; balanceUpdatedAt?: string; isDefault?: boolean; today: string }) {
  const [state, action, pending] = useActionState(saveBankAccount, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {id && <input type="hidden" name="id" value={id} />}
      <div><label className="label" htmlFor={`ba-name-${id ?? "new"}`}>Nom du compte</label><input id={`ba-name-${id ?? "new"}`} name="name" required maxLength={80} defaultValue={name} placeholder="Compte courant" className="input" /></div>
      <div><label className="label" htmlFor={`ba-bank-${id ?? "new"}`}>Banque</label><input id={`ba-bank-${id ?? "new"}`} name="bankName" maxLength={120} defaultValue={bankName} placeholder="Crédit Mutuel…" className="input" /></div>
      <div><label className="label" htmlFor={`ba-balance-${id ?? "new"}`}>Solde actuel (€)</label><input id={`ba-balance-${id ?? "new"}`} name="balance" type="number" step="0.01" required defaultValue={balance} className="input" /></div>
      <div><label className="label" htmlFor={`ba-date-${id ?? "new"}`}>Date de mise à jour</label><input id={`ba-date-${id ?? "new"}`} name="balanceUpdatedAt" type="date" required defaultValue={balanceUpdatedAt || today} max={today} className="input" /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" defaultChecked={isDefault} /> Compte par défaut pour les nouvelles écritures</label>
      <div className="sm:col-span-2"><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

/** Formulaire compte comptable (plan comptable simplifié) : numéro + nom officiel + nom arrangé pour tout le monde. */
export function AccountingAccountForm({ id, number = "", nameNormal = "", nameArranged = "" }: { id?: number; number?: string; nameNormal?: string; nameArranged?: string }) {
  const [state, action, pending] = useActionState(saveAccountingAccount, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      {id && <input type="hidden" name="id" value={id} />}
      <div><label className="label" htmlFor={`aa-num-${id ?? "new"}`}>Numéro de compte</label><input id={`aa-num-${id ?? "new"}`} name="number" required maxLength={20} defaultValue={number} placeholder="706" className="input" /></div>
      <div><label className="label" htmlFor={`aa-normal-${id ?? "new"}`}>Nom du compte (officiel)</label><input id={`aa-normal-${id ?? "new"}`} name="nameNormal" required maxLength={150} defaultValue={nameNormal} placeholder="Prestations de services" className="input" /></div>
      <div><label className="label" htmlFor={`aa-arranged-${id ?? "new"}`}>Nom simplifié (pour tout le monde)</label><input id={`aa-arranged-${id ?? "new"}`} name="nameArranged" required maxLength={150} defaultValue={nameArranged} placeholder="Ventes de prestations" className="input" /></div>
      <div className="sm:col-span-3"><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

/** Formulaire exercice comptable (période + bascule « en cours »). */
export function FiscalYearForm({ id, label = "", startDate = "", endDate = "", isCurrent = false }: { id?: number; label?: string; startDate?: string; endDate?: string; isCurrent?: boolean }) {
  const [state, action, pending] = useActionState(saveFiscalYear, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      {id && <input type="hidden" name="id" value={id} />}
      <div><label className="label" htmlFor={`fy-label-${id ?? "new"}`}>Libellé</label><input id={`fy-label-${id ?? "new"}`} name="label" required maxLength={40} defaultValue={label} placeholder="2026-2027" className="input" /></div>
      <div><label className="label" htmlFor={`fy-start-${id ?? "new"}`}>Début</label><input id={`fy-start-${id ?? "new"}`} name="startDate" type="date" required defaultValue={startDate} className="input" /></div>
      <div><label className="label" htmlFor={`fy-end-${id ?? "new"}`}>Fin</label><input id={`fy-end-${id ?? "new"}`} name="endDate" type="date" required defaultValue={endDate} className="input" /></div>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isCurrent" defaultChecked={isCurrent} /> Exercice en cours</label>
      <div className="sm:col-span-4"><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

/** Formulaire ligne prévisionnelle : montant attendu pour un compte comptable, un sens et un exercice donnés. */
export function BudgetForecastForm({
  id, fiscalYearId, accountingAccounts, direction = "expense", accountingAccountId, amount, notes = "",
}: { id?: number; fiscalYearId: number; accountingAccounts: AccountOption[]; direction?: FinanceDirection; accountingAccountId?: number; amount?: number; notes?: string }) {
  const [state, action, pending] = useActionState(saveBudgetForecast, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-5">
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="fiscalYearId" value={fiscalYearId} />
      <div>
        <label className="label" htmlFor={`bf-dir-${id ?? "new"}`}>Sens</label>
        <select id={`bf-dir-${id ?? "new"}`} name="direction" defaultValue={direction} className="input">
          {(Object.keys(DIRECTION_LABEL) as FinanceDirection[]).map((d) => <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`bf-acc-${id ?? "new"}`}>Compte comptable</label>
        <select id={`bf-acc-${id ?? "new"}`} name="accountingAccountId" required defaultValue={accountingAccountId ?? ""} className="input">
          <option value="" disabled>Choisir…</option>
          {accountingAccounts.map((a) => <option key={a.id} value={a.id}>{a.number} — {a.nameArranged}</option>)}
        </select>
      </div>
      <div><label className="label" htmlFor={`bf-amount-${id ?? "new"}`}>Montant prévu (€)</label><input id={`bf-amount-${id ?? "new"}`} name="amount" type="number" step="0.01" min="0" required defaultValue={amount} className="input" /></div>
      <div><label className="label" htmlFor={`bf-notes-${id ?? "new"}`}>Notes</label><input id={`bf-notes-${id ?? "new"}`} name="notes" maxLength={500} defaultValue={notes} className="input" /></div>
      <div className="sm:col-span-5"><Feedback state={state} /><button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

type ImportRow = {
  date: string; label: string; direction: FinanceDirection; amountCents: number;
  reference?: string; method?: string; notes?: string; accountingAccountId: number | null | undefined; // undefined = pas encore choisi
};

/** Lit un CSV sans compte comptable (date;libellé;sens;montant;référence;moyen;notes) : on ne connaît pas le
 *  compte au moment de l'import, chaque ligne se pointe ensuite dans l'aperçu. Rejette les lignes incomplètes. */
function parseImportCsv(text: string): { rows: Omit<ImportRow, "accountingAccountId">[]; errors: string[] } {
  let lines = parseCsv(text);
  if (lines[0]?.[0]?.toLowerCase().startsWith("date")) lines = lines.slice(1); // en-tête facultative
  const rows: Omit<ImportRow, "accountingAccountId">[] = [];
  const errors: string[] = [];
  lines.forEach((cols, i) => {
    const [date, label, direction, amount, reference, method, notes] = cols.map((c) => c?.trim() ?? "");
    if (!isDay(date) || !label || !amount) { errors.push(`Ligne ${i + 1} : incomplète.`); return; }
    const cents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { errors.push(`Ligne ${i + 1} : montant invalide.`); return; }
    rows.push({
      date, label: label.slice(0, 200), direction: direction?.toLowerCase().startsWith("créd") ? "income" : "expense",
      amountCents: cents, reference: reference || undefined, method: method || undefined, notes: notes || undefined,
    });
  });
  return { rows, errors };
}

/** Import CSV en deux temps : aperçu des lignes lues (sans compte comptable, on ne le connaît pas à l'import),
 *  puis on pointe chaque ligne vers un compte avant de pouvoir valider — impossible tant qu'il en manque un. */
export function CsvImportForm({ fiscalYears, bankAccounts, accountingAccounts, currentFiscalYearId }: { fiscalYears: FiscalYearOption[]; bankAccounts: BankAccountOption[]; accountingAccounts: AccountOption[]; currentFiscalYearId?: number }) {
  const [state, action, pending] = useActionState(confirmFinancialEntriesImport, undefined);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileError, setFileError] = useState("");

  const allAssigned = useMemo(() => rows !== null && rows.every((r) => r.accountingAccountId !== undefined), [rows]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    const { rows: parsed, errors } = parseImportCsv(await file.text());
    if (parsed.length === 0) { setFileError(errors[0] ?? "Aucune ligne valide dans le fichier."); setRows(null); return; }
    setRows(parsed.map((r) => ({ ...r, accountingAccountId: undefined })));
    setParseErrors(errors);
  }

  if (!rows) {
    return (
      <div className="space-y-2">
        <label className="label" htmlFor="ci-file">Fichier CSV</label>
        <input id="ci-file" name="file" type="file" accept=".csv,text/csv" onChange={onFile} className="input" />
        {fileError && <p className="text-sm text-danger" role="alert">{fileError}</p>}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ci-fy">Exercice de rattachement</label>
          <select id="ci-fy" name="fiscalYearId" defaultValue={currentFiscalYearId ?? ""} className="input">
            <option value="">— Exercice en cours —</option>
            {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ci-bank">Compte bancaire</label>
          <select id="ci-bank" name="bankAccountId" className="input">
            <option value="">— Compte par défaut —</option>
            {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {parseErrors.length > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{parseErrors.length} ligne(s) ignorée(s) (incomplètes) : {parseErrors.join(" ")}</p>
      )}

      <div className="card space-y-1 p-0">
        <h3 className="border-b border-line px-4 py-3 font-semibold">Aperçu — pointe chaque ligne vers un compte ({rows.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line bg-bg text-left text-xs text-muted"><th className="px-4 py-1.5 font-medium">Date</th><th className="py-1.5 pr-3 font-medium">Libellé</th><th className="py-1.5 pr-3 text-right font-medium">Montant</th><th className="py-1.5 pr-4 font-medium">Compte comptable</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={i} className={r.accountingAccountId === undefined ? "bg-danger/5" : undefined}>
                  <td className="whitespace-nowrap px-4 py-1.5">{r.date}</td>
                  <td className="py-1.5 pr-3">{r.label}</td>
                  <td className={`py-1.5 pr-3 text-right tabular-nums ${r.direction === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{r.direction === "income" ? "+ " : "− "}{fmtEuros(r.amountCents)}</td>
                  <td className="py-1.5 pr-4">
                    <select
                      required value={r.accountingAccountId === undefined ? "" : (r.accountingAccountId ?? "none")}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => prev!.map((row, j) => j === i ? { ...row, accountingAccountId: v === "none" ? null : Number(v) } : row));
                      }}
                      className="input"
                    >
                      <option value="" disabled>— Choisir —</option>
                      <option value="none">Non classé</option>
                      {accountingAccounts.map((a) => <option key={a.id} value={a.id}>{a.number} — {a.nameArranged}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Feedback state={state} />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { setRows(null); setParseErrors([]); }} className="btn-ghost">Changer de fichier</button>
        <button className="btn" disabled={pending || !allAssigned}>{pending ? "Import…" : allAssigned ? "Valider l'import" : "Pointe toutes les lignes pour valider"}</button>
      </div>
    </form>
  );
}

/** Formulaire de filtres (exercice/sens/poste) de la page Comptabilité : se soumet seul au changement.
 *  Par défaut, sélectionne l'exercice en cours. */
export function FinanceFilterForm({ fiscalYears, fiscalYearId, direction, category }: { fiscalYears: FiscalYearOption[]; fiscalYearId?: number; direction?: FinanceDirection; category?: FinanceCategory }) {
  return (
    <form method="get" className="card flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="f-fy">Exercice</label>
        <select id="f-fy" name="fy" defaultValue={fiscalYearId ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input w-auto">
          {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-direction">Sens</label>
        <select id="f-direction" name="direction" defaultValue={direction ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input w-auto">
          <option value="">Tous</option>
          {(Object.keys(DIRECTION_LABEL) as FinanceDirection[]).map((d) => <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-category">Poste</label>
        <select id="f-category" name="category" defaultValue={category ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input w-auto">
          <option value="">Tous</option>
          {(Object.keys(CATEGORY_LABEL) as FinanceCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>
      {(direction || category) && <a href={fiscalYearId ? `?fy=${fiscalYearId}` : "?"} className="btn-ghost">Réinitialiser</a>}
    </form>
  );
}
