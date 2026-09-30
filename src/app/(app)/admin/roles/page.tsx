import { asc, count } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { PERM_FIELDS } from "@/lib/perms";
import { DeleteRoleForm, RoleForm } from "@/components/admin-user-forms";

export const metadata = { title: "Rôles" };

export default async function RolesPage() {
  const [list, counts] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.id)),
    db.select({ roleId: users.roleId, n: count() }).from(users).groupBy(users.roleId),
  ]);
  const members = new Map(counts.map((c) => [c.roleId, Number(c.n)]));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Un rôle regroupe des droits. Crée les rôles dont tu as besoin (tuteur, intervenant, régisseur…), puis donne-les aux personnes dans l&apos;onglet Utilisateurs.
        Les rôles « Administrateur » et « Membre » sont d&apos;origine et ne peuvent pas être supprimés.
      </p>

      <section className="card space-y-3">
        <h2 className="font-semibold">Créer un rôle</h2>
        <RoleForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Rôles ({list.length})</h2>
        {list.map((r) => {
          const n = members.get(r.id) ?? 0;
          const granted = r.isAdmin ? ["Tous les droits"] : PERM_FIELDS.filter((f) => r[f.field]).map((f) => f.label);
          return (
            <details key={r.id} className="card p-0">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 marker:hidden">
                {r.isAdmin && <ShieldCheck size={16} className="text-accent" aria-label="Administrateur" />}
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-muted">{n} personne{n > 1 ? "s" : ""}</span>
                <span className="ml-auto flex flex-wrap gap-1">
                  {granted.length === 0 ? <span className="text-xs text-muted">Aucun droit particulier</span> : granted.map((g) => <span key={g} className="rounded-full bg-accent/15 px-2 py-0.5 text-xs">{g}</span>)}
                </span>
              </summary>
              <div className="space-y-4 border-t border-line p-4">
                {r.description && <p className="text-sm text-muted">{r.description}</p>}
                <RoleForm role={{ ...r, description: r.description ?? "", system: r.key === "admin" || r.key === "member" }} />
                {r.key !== "admin" && r.key !== "member" && (
                  <div className="border-t border-line pt-3"><DeleteRoleForm id={r.id} /></div>
                )}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
