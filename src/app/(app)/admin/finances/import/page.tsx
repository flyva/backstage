import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAccountingAccounts, getBankAccounts, getCurrentFiscalYear, getFiscalYears } from "@/lib/finance-data";
import { CsvImportForm } from "@/components/finance-forms";

export const metadata = { title: "Importer des écritures" };

// Import CSV d'écritures comptables, avec un modèle téléchargeable. Pas de compte comptable dans le fichier (on ne
// le connaît pas à l'import) : un aperçu permet de pointer chaque ligne vers un compte avant de valider.
export default async function ImportFinancesPage() {
  await requireAdmin();
  const [bankAccounts, accountingAccounts, fiscalYears, current] = await Promise.all([
    getBankAccounts(), getAccountingAccounts(), getFiscalYears(), getCurrentFiscalYear(),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/finances" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
      <h2 className="text-xl font-semibold">Importer des écritures (CSV)</h2>
      <div className="card space-y-3">
        <p className="text-sm text-muted">
          Colonnes attendues, séparées par des points-virgules : <code>Date (AAAA-MM-JJ) ; Libellé ; Sens (Recette/Dépense) ;
          Montant ; Référence ; Moyen de paiement ; Notes</code>. Pas de compte comptable dans le fichier : tu pointes
          chaque ligne vers un compte dans l&apos;aperçu, juste après avoir choisi le fichier. La première ligne peut
          être un en-tête, elle est ignorée automatiquement.
        </p>
        <a href="/admin/finances/import/modele.csv" className="btn-ghost w-fit"><Download size={16} /> Télécharger le modèle</a>
      </div>
      <div className="card">
        <CsvImportForm fiscalYears={fiscalYears} bankAccounts={bankAccounts} accountingAccounts={accountingAccounts} currentFiscalYearId={current?.id} />
      </div>
    </div>
  );
}
