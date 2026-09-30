import { desc, eq, sql } from "drizzle-orm";
import { ChevronUp, Trash2 } from "lucide-react";
import { db } from "@/db";
import { bdeIdeas, bdeIdeaVotes, IDEA_STATUSES, users, type IdeaStatus } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { canPublish } from "@/lib/news";
import { deleteIdea, setIdeaStatus, toggleIdeaVote } from "@/lib/bde-actions";
import { IdeaForm } from "@/components/bde-forms";

export const metadata = { title: "BDE · Boîte à idées" };

const STATUS_LABEL: Record<IdeaStatus, string> = { new: "Nouvelle", planned: "Prévue", done: "Réalisée", rejected: "Non retenue" };
const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

export default async function BdeIdeasPage() {
  const user = await requireModule("bde");
  const manager = canPublish(user);

  const ideas = await db
    .select({
      idea: bdeIdeas,
      author: users.name,
      votes: sql<number>`(select count(*) from ${bdeIdeaVotes} where ${bdeIdeaVotes.ideaId} = ${bdeIdeas.id})`,
      mine: sql<number>`(select count(*) from ${bdeIdeaVotes} where ${bdeIdeaVotes.ideaId} = ${bdeIdeas.id} and ${bdeIdeaVotes.userId} = ${user.id})`,
    })
    .from(bdeIdeas)
    .innerJoin(users, eq(users.id, bdeIdeas.userId))
    .orderBy(desc(bdeIdeas.createdAt))
    .limit(100);
  // Les plus soutenues d'abord ; les idées écartées en dernier.
  const rank = (s: IdeaStatus) => (s === "rejected" ? 1 : 0);
  ideas.sort((a, b) => rank(a.idea.status) - rank(b.idea.status) || Number(b.votes) - Number(a.votes) || b.idea.createdAt.getTime() - a.idea.createdAt.getTime());

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="font-semibold">Proposer une idée</h2>
        <IdeaForm />
      </section>

      {ideas.length === 0 && <p className="text-sm text-muted">Aucune idée pour le moment : lance-toi !</p>}

      <ul className="space-y-2">
        {ideas.map(({ idea, author, votes, mine }) => (
          <li key={idea.id} className="card flex gap-3 p-3">
            <form action={toggleIdeaVote} className="shrink-0">
              <input type="hidden" name="ideaId" value={idea.id} />
              <button
                aria-pressed={Number(mine) > 0}
                aria-label="Soutenir cette idée"
                className={`flex w-12 flex-col items-center rounded-lg border py-1 text-sm ${Number(mine) > 0 ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:border-accent"}`}
              >
                <ChevronUp size={16} />
                <span className="tabular-nums">{Number(votes)}</span>
              </button>
            </form>
            <div className="min-w-0 flex-1 space-y-1">
              <p className={`whitespace-pre-line text-sm ${idea.status === "rejected" ? "text-muted line-through" : ""}`}>{idea.body}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{dateFmt.format(idea.createdAt)}</span>
                {/* L'auteur n'est visible que de l'équipe BDE. */}
                {manager && <span>· {author}</span>}
                {idea.status !== "new" && (
                  <span className={`rounded-md border px-1.5 py-0.5 ${idea.status === "planned" || idea.status === "done" ? "border-accent text-accent" : "border-line"}`}>
                    {STATUS_LABEL[idea.status]}
                  </span>
                )}
              </div>
              {manager && (
                <form action={setIdeaStatus} className="flex items-center gap-2 pt-1">
                  <input type="hidden" name="ideaId" value={idea.id} />
                  <select name="status" defaultValue={idea.status} aria-label="Statut" className="input w-auto text-xs">
                    {IDEA_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                  <button className="btn-ghost text-xs">OK</button>
                </form>
              )}
            </div>
            {(manager || idea.userId === user.id) && (
              <form action={deleteIdea} className="shrink-0">
                <input type="hidden" name="ideaId" value={idea.id} />
                <button className="p-1 text-muted hover:text-danger" aria-label="Supprimer l'idée"><Trash2 size={14} /></button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
