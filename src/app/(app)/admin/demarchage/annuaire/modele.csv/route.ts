import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

// Modèle CSV pour l'import de l'annuaire d'entreprises : mêmes colonnes que ce que l'action d'import attend
// (importCompaniesCsv, src/lib/company-search-actions.ts).
export async function GET() {
  await requireAdmin();
  const csv = toCsv(
    [
      "Nom", "Ville", "Département", "Secteur", "Adresse", "Types (son,lumiere,video)", "Salaire", "Sources", "Avantages",
      "Titre du contact", "Nom du contact", "Téléphone", "Email",
      "Offre/Spontanée (offre|spontanee)", "Dernier contact (jj/mm/aaaa)", "Statut", "Priorité (faible|moyenne|haute)",
      "(réservé)", "Observation", "Délai (jours)",
    ],
    [
      [
        "4 CAST", "St Laurent du Var", "06", "Prestataire", "12 rue de la Mer, 06700 St Laurent du Var", "son,lumiere", "", "",
        "", "Booking", "", "06 59 67 42 34", "booking@4cast.fr",
        "spontanee", "01/04/2026", "A contacter", "moyenne", "", "Ne prend pas d'alternant", "15",
      ],
    ],
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modele-import-entreprises.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
