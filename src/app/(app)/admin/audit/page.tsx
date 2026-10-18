import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ago } from "@/lib/relative-time";

export const metadata = { title: "Journal d'audit" };

const ACTION_LABEL: Record<string, string> = { view: "a consulté", update: "a modifié", delete: "a supprimé", anonymize: "a anonymisé" };

export default async function AuditLogPage() {
  await requireAdmin();
  const rows = await db
    .select({ id: adminAuditLog.id, action: adminAuditLog.action, detail: adminAuditLog.detail, createdAt: adminAuditLog.createdAt, adminName: users.name })
    .from(adminAuditLog)
    .innerJoin(users, eq(users.id, adminAuditLog.adminId))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(200);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Les 200 accès ou modifications les plus récents, côté administration, sur la fiche d&apos;une personne. Les consultations de sa propre fiche ne sont pas tracées.</p>
      <section className="card p-0">
        {rows.length === 0 && <p className="p-4 text-sm text-muted">Rien pour l&apos;instant.</p>}
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm">
              <span className="font-medium">{r.adminName}</span>
              <span className="text-muted">{ACTION_LABEL[r.action] ?? r.action}</span>
              {r.detail && <span>{r.detail}</span>}
              <span className="ml-auto shrink-0 text-xs text-muted">{ago(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
