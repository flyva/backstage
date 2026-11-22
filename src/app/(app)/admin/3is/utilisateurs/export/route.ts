import { requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { fetchDirectoryRows } from "../page";

const STATUS_LABEL: Record<string, string> = { active: "Actif", pending: "En attente", disabled: "Désactivé", rejected: "Refusé" };

export async function GET() {
  await requireAdmin();
  const rows = await fetchDirectoryRows();
  const csv = toCsv(
    ["Nom", "E-mail", "Rôle", "Formation", "Promotion", "Statut"],
    rows.map(({ u, roleName, trackName, className }) => [u.name, u.email, roleName ?? "", trackName ?? "", className ?? "", STATUS_LABEL[u.status] ?? u.status]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="utilisateurs-3is.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
