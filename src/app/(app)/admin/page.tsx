import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/forms";
import { setRole, approveUser, rejectUser } from "@/lib/actions";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [settings, allUsers] = await Promise.all([
    getSettings(),
    db.select().from(users).orderBy(asc(users.createdAt)),
  ]);

  return (
    <div className="space-y-8">
      <section className="card space-y-3">
        <h2 className="font-semibold">Paramètres de l&apos;école</h2>
        <SettingsForm values={settings as Record<string, string>} />
      </section>

      {allUsers.some((u) => u.status === "pending") && (
        <section className="card space-y-3 border-accent">
          <h2 className="font-semibold">En attente de validation ({allUsers.filter((u) => u.status === "pending").length})</h2>
          <p className="text-sm text-muted">
            Comptes Google personnels (adresse hors école) : ils n&apos;ont accès à rien tant que tu ne les as pas validés.
          </p>
          <ul className="divide-y divide-line text-sm">
            {allUsers.filter((u) => u.status === "pending").map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted">{u.email}</div>
                </div>
                <form action={approveUser}><input type="hidden" name="id" value={u.id} /><button className="btn">Valider</button></form>
                <form action={rejectUser}><input type="hidden" name="id" value={u.id} /><button className="btn-ghost">Refuser</button></form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Utilisateurs ({allUsers.filter((u) => u.status === "active").length})</h2>
        <ul className="divide-y divide-line text-sm">
          {allUsers.filter((u) => u.status === "active").map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.name}</div>
                <div className="truncate text-xs text-muted">{u.email}</div>
              </div>
              {u.id === admin.id ? (
                <span className="text-xs text-muted">Toi (admin)</span>
              ) : (
                <form action={setRole} className="flex gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="input w-auto">
                    <option value="member">Membre</option>
                    <option value="materiel">Référent matériel</option>
                    <option value="bde">BDE</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn-ghost">OK</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
