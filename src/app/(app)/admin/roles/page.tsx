import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { Plus, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LEVEL_FIELDS, LEVEL_LABEL, levelOf } from "@/lib/perms";

export const metadata = { title: "Rôles" };

// Liste propre (un rôle par ligne, modification sur sa propre page) : plus de gros formulaires imbriqués les uns
// dans les autres à l'ouverture de chaque rôle.
export default async function RolesPage() {
  await requireAdmin();
  const [list, counts] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.id)),
    db.select({ roleId: users.roleId, n: count() }).from(users).groupBy(users.roleId),
  ]);
  const members = new Map(counts.map((c) => [c.roleId, Number(c.n)]));

  return (
    <div className="space-y-6">
      <div className="card space-y-1 border-accent text-sm">
        <p>
          Un rôle regroupe des droits. Crée les rôles dont tu as besoin (tuteur, intervenant, régisseur…), puis donne-les
          aux personnes dans l&apos;onglet Utilisateurs.
        </p>
        <p className="text-muted">Les rôles « Administrateur » et « Membre » sont d&apos;origine et ne peuvent pas être supprimés.</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Rôles ({list.length})</h2>
        <Link href="/admin/roles/nouveau" className="btn"><Plus size={16} /> Créer un rôle</Link>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Rôle</th>
              <th className="px-3 py-2 text-center font-medium">Membres</th>
              <th className="px-3 py-2 font-medium">Accès</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((r) => {
              const n = members.get(r.id) ?? 0;
              const granted = r.isAdmin
                ? ["Tous les droits"]
                : [...(r.permAdministration ? ["Administration"] : []), ...LEVEL_FIELDS.map((f) => ({ f, l: levelOf(r, f) })).filter((x) => x.l !== "none").map((x) => `${x.f.label} : ${LEVEL_LABEL[x.l]}`)];
              return (
                <tr key={r.id} className="align-middle hover:bg-bg/60">
                  <td className="px-4 py-2.5 font-medium">
                    <span className="flex items-center gap-1.5">
                      {r.isAdmin && <ShieldCheck size={15} className="shrink-0 text-accent" aria-label="Administrateur" />}
                      {r.name}
                    </span>
                    {r.description && <span className="block text-xs font-normal text-muted">{r.description}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${n > 0 ? "bg-accent/15 text-accent" : "text-muted"}`}>{n}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {granted.length === 0 ? <span className="text-xs text-muted">Lecture seule partout</span> : granted.map((g) => <span key={g} className="rounded-full bg-accent/15 px-2 py-0.5 text-xs">{g}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-nowrap">
                    <Link href={`/admin/roles/${r.id}`} className="btn-ghost text-xs">Modifier</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
