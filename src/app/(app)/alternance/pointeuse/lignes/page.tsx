import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dayLabel, fmtHours, fmtTime } from "@/lib/alternance";
import { entrySpanMinutes } from "@/lib/pointeuse";
import { deleteTimeEntry } from "@/lib/time-actions";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Toutes les lignes de pointage" };

// Grand tableau de toutes les lignes jamais saisies (tous mois confondus), pour les éditer ou les supprimer d'un coup
// d'œil sans naviguer mois par mois. La saisie au jour le jour reste sur la page Pointeuse.
export default async function PointeuseLinesPage() {
  const user = await requireUser();
  const entries = await db.select().from(timeEntries).where(eq(timeEntries.userId, user.id)).orderBy(desc(timeEntries.day), asc(timeEntries.startMinutes));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/alternance/pointeuse" className="flex items-center gap-1 text-sm text-muted hover:text-fg"><ChevronLeft size={16} /> Pointeuse</Link>
        <span className="text-sm text-muted">{entries.length} ligne{entries.length > 1 ? "s" : ""} au total</span>
      </div>

      {entries.length === 0 && <p className="text-sm text-muted">Aucune ligne saisie pour l&apos;instant.</p>}

      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg text-left text-xs text-muted">
                <th className="py-1.5 pl-3 pr-3 font-medium">Date</th>
                <th className="py-1.5 pr-3 font-medium">Horaires</th>
                <th className="py-1.5 pr-3 font-medium">Pause</th>
                <th className="py-1.5 pr-3 font-medium">Effectif</th>
                <th className="py-1.5 pr-3 font-medium">Commentaire</th>
                <th className="py-1.5 pr-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => {
                const crosses = e.endDay > e.day;
                const effective = Math.max(0, entrySpanMinutes(e, e.day) - e.pauseMinutes);
                return (
                  <tr key={e.id}>
                    <td className="py-1.5 pl-3 pr-3 whitespace-nowrap capitalize">{dayLabel(e.day)}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                      {fmtTime(e.startMinutes)} – {fmtTime(e.endMinutes)}
                      {crosses && <span className="ml-1 rounded-full border border-line px-1.5 py-0.5 text-[10px] font-medium">+1 j</span>}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtHours(e.pauseMinutes)}</td>
                    <td className="py-1.5 pr-3 tabular-nums font-medium">{fmtHours(effective)}</td>
                    <td className="max-w-56 truncate py-1.5 pr-3 text-muted" title={e.comment ?? ""}>{e.comment ?? ""}</td>
                    <td className="py-1.5 pr-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/alternance/pointeuse/lignes/${e.id}`} className="flex items-center gap-1 text-xs text-muted hover:text-fg"><Pencil size={13} /> Modifier</Link>
                        <form action={deleteTimeEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <ConfirmButton message={`Supprimer la ligne du ${dayLabel(e.day)} (${fmtTime(e.startMinutes)} – ${fmtTime(e.endMinutes)}) ?`} className="flex items-center gap-1 text-xs text-muted hover:text-danger">
                            <Trash2 size={13} /> Supprimer
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
