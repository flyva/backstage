import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAccountingAccounts } from "@/lib/finance-data";
import { deleteAccountingAccount } from "@/lib/finance-actions";
import { AccountingAccountForm } from "@/components/finance-forms";
import { FinanceSettingsTabs } from "@/components/FinanceSettingsTabs";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Plan comptable" };

// Paramètres comptabilité → Comptes : le plan comptable simplifié (numéro, nom officiel, nom arrangé).
export default async function FinanceSettingsAccountsPage() {
  await requireAdmin();
  const accounts = await getAccountingAccounts();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Paramètres comptabilité</h2>
      <FinanceSettingsTabs active="/admin/comptabilite-parametres/comptes" />

      <section className="card space-y-3">
        <h3 className="font-semibold">Ajouter un compte</h3>
        <p className="text-sm text-muted">Le nom « officiel » sert pour le document comptable normal (impôts, DAF). Le nom « simplifié » est celui affiché dans le tableau général.</p>
        <AccountingAccountForm />
      </section>

      <section className="card p-0">
        <h3 className="border-b border-line px-4 py-3 font-semibold">Comptes ({accounts.length})</h3>
        {accounts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Aucun compte pour le moment.</p>
        ) : (
          accounts.map((a) => (
            <details key={a.id} className="border-t border-line">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                <span className="text-muted">{a.number}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{a.nameArranged}</span>
                <span className="hidden text-xs text-muted sm:block">{a.nameNormal}</span>
              </summary>
              <div className="space-y-4 p-4 pt-0">
                <AccountingAccountForm id={a.id} number={a.number} nameNormal={a.nameNormal} nameArranged={a.nameArranged} />
                <form action={deleteAccountingAccount} className="border-t border-line pt-3">
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message={`Supprimer le compte « ${a.nameArranged} » ?`} className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</ConfirmButton>
                </form>
              </div>
            </details>
          ))
        )}
      </section>
    </div>
  );
}
