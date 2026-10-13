import { desc, gt, isNull, or } from "drizzle-orm";
import { Sparkles, Wrench, Hammer } from "lucide-react";
import { db } from "@/db";
import { updates, type UpdateKind } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/relative-time";

export const metadata = { title: "Nouveautés" };

const KIND: Record<UpdateKind, { label: string; icon: typeof Sparkles; color: string }> = {
  feature: { label: "Nouveauté", icon: Sparkles, color: "#6366f1" },
  fix: { label: "Correction", icon: Wrench, color: "#f59e0b" },
  maintenance: { label: "Maintenance", icon: Hammer, color: "#64748b" },
};

export default async function UpdatesPage() {
  await requireUser();
  // Les nouveautés dont la date de fin de publication est passée restent enregistrées (modifiables en admin), mais
  // ne s'affichent plus ici.
  const rows = await db.select().from(updates).where(or(isNull(updates.publishUntil), gt(updates.publishUntil, new Date()))).orderBy(desc(updates.createdAt));
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Nouveautés</h1>
        <p className="text-sm text-muted">Les dernières mises à jour de Backstage.</p>
      </div>
      {rows.length === 0 ? (
        <p className="card text-sm text-muted">Rien à annoncer pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => {
            const { label, icon: Icon, color } = KIND[u.kind];
            return (
              <li key={u.id} className="card flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ background: color }} aria-hidden><Icon size={14} /></span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{u.title}</span>
                    <span className="shrink-0 text-xs text-muted">{label} · {ago(u.createdAt)}</span>
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-muted">{u.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
