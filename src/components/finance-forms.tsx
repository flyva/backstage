"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import type { FinanceCategory, FinanceDirection } from "@/db/schema";
import { CATEGORY_LABEL, DIRECTION_LABEL } from "@/lib/finance";
import {
  importFinancialEntriesCsv, saveAccountingAccount, saveBankAccount, saveBudgetForecast,
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

/** Formulaire d'import CSV d'écritures, rattaché à un exercice et un compte bancaire par défaut. */
export function CsvImportForm({ fiscalYears, bankAccounts, currentFiscalYearId }: { fiscalYears: FiscalYearOption[]; bankAccounts: BankAccountOption[]; currentFiscalYearId?: number }) {
  const [state, action, pending] = useActionState(importFinancialEntriesCsv, undefined);
  return (
    <form action={action} className="space-y-4">
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
      <div>
        <label className="label" htmlFor="ci-file">Fichier CSV</label>
        <input id="ci-file" name="file" type="file" accept=".csv,text/csv" required className="input" />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Import…" : "Importer"}</button>
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
