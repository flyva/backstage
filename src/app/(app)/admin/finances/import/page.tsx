import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getBankAccounts, getCurrentFiscalYear, getFiscalYears } from "@/lib/finance-data";
import { CsvImportForm } from "@/components/finance-forms";

export const metadata = { title: "Importer des écritures" };

// Import CSV d'écritures comptables, avec un modèle téléchargeable (mêmes colonnes que l'export d'exercice).
export default async function ImportFinancesPage() {
  await requireAdmin();
  const [bankAccounts, fiscalYears, current] = await Promise.all([getBankAccounts(), getFiscalYears(), getCurrentFiscalYear()]);

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/admin/finances" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Comptabilité</Link>
      <h2 className="text-xl font-semibold">Importer des écritures (CSV)</h2>
      <div className="card space-y-3">
        <p className="text-sm text-muted">
          Colonnes attendues, séparées par des points-virgules : <code>Date (AAAA-MM-JJ) ; Libellé ; Sens (Recette/Dépense) ;
          Montant ; N° de compte comptable ; Compte bancaire (indicatif) ; Référence ; Moyen de paiement ; Notes</code>.
          La première ligne peut être un en-tête, elle est ignorée automatiquement.
        </p>
        <a href="/admin/finances/import/modele.csv" className="btn-ghost w-fit"><Download size={16} /> Télécharger le modèle</a>
      </div>
      <div className="card">
        <CsvImportForm fiscalYears={fiscalYears} bankAccounts={bankAccounts} currentFiscalYearId={current?.id} />
      </div>
    </div>
  );
}
