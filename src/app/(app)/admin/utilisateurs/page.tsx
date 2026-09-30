import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ChevronRight, UserRound } from "lucide-react";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Utilisateurs" };

const STATUS = {
  active: { label: "Actif", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  disabled: { label: "Désactivé", cls: "bg-zinc-500/20 text-muted" },
} as const;

export default async function UsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase().slice(0, 80);
  const roleFilter = typeof sp.role === "string" ? sp.role : "";
  const statusFilter = typeof sp.statut === "string" ? sp.statut : "";

  const [rows, allRoles] = await Promise.all([
    db.select({ u: users, roleName: roles.name }).from(users).leftJoin(roles, eq(roles.id, users.roleId)).orderBy(asc(users.lastName), asc(users.firstName)),
    db.select().from(roles).orderBy(asc(roles.name)),
  ]);
  const list = rows.filter(({ u }) =>
    (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)) &&
    (!roleFilter || String(u.roleId) === roleFilter) &&
    (!statusFilter || u.status === statusFilter),
  );

  return (
    <div className="space-y-5">
      <form role="search" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Rechercher un nom ou une adresse…" aria-label="Rechercher" className="input max-w-xs" />
        <select name="role" defaultValue={roleFilter} aria-label="Rôle" className="input w-auto"><option value="">Tous les rôles</option>{allRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select name="statut" defaultValue={statusFilter} aria-label="Statut" className="input w-auto"><option value="">Tous les statuts</option><option value="active">Actifs</option><option value="pending">En attente</option><option value="disabled">Désactivés</option></select>
        <button className="btn-ghost">Filtrer</button>
        {(q || roleFilter || statusFilter) && <Link href="/admin/utilisateurs" className="btn-ghost">Effacer</Link>}
      </form>

      <section className="card p-0">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Utilisateurs ({list.length}{list.length !== rows.length ? ` sur ${rows.length}` : ""})</h2>
        <ul className="divide-y divide-line">
          {list.length === 0 && <li className="px-4 py-6 text-sm text-muted">Personne ne correspond.</li>}
          {list.map(({ u, roleName }) => (
            <li key={u.id}>
              <Link href={`/admin/utilisateurs/${u.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-bg">
                <UserRound size={16} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{u.name}{u.id === admin.id && <span className="ml-2 text-xs text-muted">(toi)</span>}</span>
                  <span className="block truncate text-xs text-muted">{u.email}</span>
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-xs">{roleName ?? "Sans rôle"}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[u.status].cls}`}>{STATUS[u.status].label}</span>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
