import Link from "next/link";
import { asc, eq, isNull, ne, or } from "drizzle-orm";
import { Download, Printer } from "lucide-react";
import { db } from "@/db";
import { classes, roles, tracks, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Utilisateurs (3IS)" };

const STATUS_LABEL: Record<string, string> = { active: "Actif", pending: "En attente", disabled: "Désactivé", rejected: "Refusé" };

export async function fetchDirectoryRows() {
  return db
    .select({ u: users, roleName: roles.name, trackName: tracks.name, className: classes.name })
    .from(users)
    .leftJoin(roles, eq(roles.id, users.roleId))
    .leftJoin(tracks, eq(tracks.id, users.trackId))
    .leftJoin(classes, eq(classes.id, users.classId))
    .where(or(isNull(roles.isTest), ne(roles.isTest, true)))
    .orderBy(asc(users.lastName), asc(users.firstName));
}

export default async function Admin3isUsersPage() {
  await requireAdmin();
  const rows = await fetchDirectoryRows();

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Tous les utilisateurs inscrits</h2>
            <p className="text-sm text-muted">Lecture seule (édition dans Comptes → Utilisateurs). Les comptes de rôle « test » sont exclus.</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/3is/utilisateurs/export" className="btn-ghost text-xs"><Download size={14} /> Excel (CSV)</a>
            <Link href="/admin/3is/utilisateurs/imprimer" className="btn-ghost text-xs" target="_blank"><Printer size={14} /> PDF (imprimer)</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-muted">
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">E-mail</th>
                <th className="py-2 pr-3">Rôle</th>
                <th className="py-2 pr-3">Formation</th>
                <th className="py-2 pr-3">Promotion</th>
                <th className="py-2 pr-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ u, roleName, trackName, className }) => (
                <tr key={u.id}>
                  <td className="py-2 pr-3">{u.name}</td>
                  <td className="py-2 pr-3 text-muted">{u.email}</td>
                  <td className="py-2 pr-3">{roleName ?? "—"}</td>
                  <td className="py-2 pr-3">{trackName ?? "—"}</td>
                  <td className="py-2 pr-3">{className ?? "—"}</td>
                  <td className="py-2 pr-3">{STATUS_LABEL[u.status] ?? u.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-muted">Aucun utilisateur.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
