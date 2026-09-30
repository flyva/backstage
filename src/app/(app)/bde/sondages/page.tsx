import { asc, desc, inArray } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { bdePollOptions, bdePolls, bdePollVotes } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { canPublish } from "@/lib/news";
import { deletePoll, vote } from "@/lib/bde-actions";
import { PollForm } from "@/components/bde-forms";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "BDE · Sondages" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function BdePollsPage() {
  const user = await requireModule("bde");
  const manager = canPublish(user);
  const now = new Date();

  const polls = await db.select().from(bdePolls).orderBy(desc(bdePolls.createdAt)).limit(30);
  const ids = polls.map((p) => p.id);
  const [options, votes] = ids.length
    ? await Promise.all([
        db.select().from(bdePollOptions).where(inArray(bdePollOptions.pollId, ids)).orderBy(asc(bdePollOptions.position)),
        db.select().from(bdePollVotes).where(inArray(bdePollVotes.pollId, ids)),
      ])
    : [[], []];
  const optsByPoll = Map.groupBy(options, (o) => o.pollId);

  return (
    <div className="space-y-6">
      {polls.length === 0 && <p className="text-sm text-muted">Aucun sondage pour le moment.</p>}

      {polls.map((p) => {
        const closed = p.closesAt !== null && p.closesAt < now;
        const pollVotes = votes.filter((v) => v.pollId === p.id);
        const mine = pollVotes.find((v) => v.userId === user.id)?.optionId ?? null;
        const opts = optsByPoll.get(p.id) ?? [];
        const total = pollVotes.length;
        // Les résultats sont visibles après avoir voté, une fois le sondage clos, ou pour l'équipe BDE.
        const showResults = mine !== null || closed || manager;

        return (
          <section key={p.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{p.question}</h2>
                <p className="text-xs text-muted">
                  {closed ? "Terminé" : p.closesAt ? `Ouvert jusqu'au ${dateFmt.format(p.closesAt)}` : "Ouvert"} · {total} vote{total > 1 ? "s" : ""}
                </p>
              </div>
              {manager && (
                <form action={deletePoll}>
                  <input type="hidden" name="pollId" value={p.id} />
                  <ConfirmButton message="Supprimer ce sondage ?" className="text-muted hover:text-danger"><Trash2 size={16} /></ConfirmButton>
                </form>
              )}
            </div>

            <ul className="space-y-2">
              {opts.map((o) => {
                const n = pollVotes.filter((v) => v.optionId === o.id).length;
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                return (
                  <li key={o.id}>
                    <form action={vote}>
                      <input type="hidden" name="optionId" value={o.id} />
                      <button
                        disabled={closed}
                        aria-pressed={mine === o.id}
                        className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm ${mine === o.id ? "border-accent" : "border-line"} ${closed ? "" : "hover:border-accent"}`}
                      >
                        {showResults && <span className="absolute inset-y-0 left-0 bg-accent/20" style={{ width: `${pct}%` }} aria-hidden />}
                        <span className="relative flex items-center justify-between gap-3">
                          <span>{mine === o.id && "✓ "}{o.label}</span>
                          {showResults && <span className="text-xs tabular-nums text-muted">{pct} % ({n})</span>}
                        </span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
            {!closed && mine !== null && <p className="text-xs text-muted">Tu peux changer ton vote tant que le sondage est ouvert.</p>}
          </section>
        );
      })}

      {manager && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Créer un sondage</h2>
          <PollForm />
        </section>
      )}
    </div>
  );
}
