import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { getBankAccounts } from "@/lib/finance-data";
import { deleteBankAccount } from "@/lib/finance-actions";
import { BankAccountForm } from "@/components/finance-forms";
import { FinanceSettingsTabs } from "@/components/FinanceSettingsTabs";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Paramètres comptabilité" };

// Paramètres comptabilité → Général : solde actuel de chaque compte bancaire, banque et date de mise à jour.
export default async function FinanceSettingsGeneralPage() {
  await requireAdmin();
  const bankAccounts = await getBankAccounts();
  const today = todayParis();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Paramètres comptabilité</h2>
      <FinanceSettingsTabs active="/admin/comptabilite-parametres" />

      <section className="card space-y-3">
        <h3 className="font-semibold">Ajouter un compte bancaire</h3>
        <BankAccountForm today={today} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Comptes bancaires ({bankAccounts.length})</h3>
        {bankAccounts.length === 0 && <p className="text-sm text-muted">Aucun compte bancaire. Ajoute le compte courant en premier.</p>}
        {bankAccounts.map((b) => (
          <details key={b.id} className="card p-0">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
              <span className="min-w-0 flex-1 truncate font-medium">{b.name}{b.isDefault && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Par défaut</span>}</span>
              <span className="hidden text-xs text-muted sm:block">{b.bankName}</span>
              <span className="font-semibold tabular-nums">{(b.balanceCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
            </summary>
            <div className="space-y-4 border-t border-line p-4">
              <p className="text-xs text-muted">Mis à jour le {b.balanceUpdatedAt ?? "—"}</p>
              <BankAccountForm today={today} id={b.id} name={b.name} bankName={b.bankName ?? ""} balance={b.balanceCents / 100} balanceUpdatedAt={b.balanceUpdatedAt ?? ""} isDefault={b.isDefault} />
              <form action={deleteBankAccount} className="border-t border-line pt-3">
                <input type="hidden" name="id" value={b.id} />
                <ConfirmButton message={`Supprimer le compte « ${b.name} » ?`} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</ConfirmButton>
              </form>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
