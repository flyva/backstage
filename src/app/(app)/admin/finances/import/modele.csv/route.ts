import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

// Modèle CSV pour l'import d'écritures comptables : mêmes colonnes que ce que l'action d'import attend.
export async function GET() {
  await requireAdmin();
  const csv = toCsv(
    ["Date", "Libellé", "Sens", "Montant", "Référence", "Moyen de paiement", "Notes"],
    [
      ["2026-09-15", "Cotisation rentrée", "Recette", "15.00", "", "Espèces", ""],
      ["2026-09-20", "Achat fournitures soirée", "Dépense", "42.50", "F2026-014", "CB", ""],
    ],
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"modele-import-comptabilite.csv\"",
      "Cache-Control": "private, no-store",
    },
  });
}
