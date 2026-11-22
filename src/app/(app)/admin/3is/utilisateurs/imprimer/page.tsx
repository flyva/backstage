import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PrintButton } from "@/components/PrintButton";
import { fetchDirectoryRows } from "../page";

export const metadata = { title: "Utilisateurs (3IS) — impression" };

const STATUS_LABEL: Record<string, string> = { active: "Actif", pending: "En attente", disabled: "Désactivé", rejected: "Refusé" };

export default async function Admin3isUsersPrintPage() {
  await requireAdmin();
  const rows = await fetchDirectoryRows();

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/3is/utilisateurs" className="text-sm text-muted hover:text-fg">← Utilisateurs</Link>
        <PrintButton />
      </div>
      <header className="space-y-1 border-b-2 border-line pb-4">
        <h1 className="text-2xl font-bold">Utilisateurs inscrits</h1>
        <p className="text-sm text-muted">{rows.length} compte{rows.length > 1 ? "s" : ""} (comptes de test exclus)</p>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-line text-left"><th className="py-1.5 pr-3">Nom</th><th className="py-1.5 pr-3">E-mail</th><th className="py-1.5 pr-3">Rôle</th><th className="py-1.5 pr-3">Formation</th><th className="py-1.5 pr-3">Promotion</th><th className="py-1.5 pr-3">Statut</th></tr>
        </thead>
        <tbody>
          {rows.map(({ u, roleName, trackName, className }) => (
            <tr key={u.id} className="border-b border-line">
              <td className="py-1.5 pr-3">{u.name}</td>
              <td className="py-1.5 pr-3">{u.email}</td>
              <td className="py-1.5 pr-3">{roleName ?? "—"}</td>
              <td className="py-1.5 pr-3">{trackName ?? "—"}</td>
              <td className="py-1.5 pr-3">{className ?? "—"}</td>
              <td className="py-1.5 pr-3">{STATUS_LABEL[u.status] ?? u.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
