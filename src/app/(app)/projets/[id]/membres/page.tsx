import { asc, eq } from "drizzle-orm";
import { Trash2, LogOut } from "lucide-react";
import { db } from "@/db";
import { projectMembers, users } from "@/db/schema";
import { requireProject, ROLE_LABEL } from "@/lib/projects";
import { removeMember, setMemberRole } from "@/lib/project-actions";
import { AddMemberForm } from "@/components/project-forms";

export const metadata = { title: "Équipe du projet" };

export default async function ProjectMembersPage({ params }: PageProps<"/projets/[id]/membres">) {
  const { id } = await params;
  const { user, project, role } = await requireProject(Number(id));
  const isOwner = role === "owner";

  const members = await db
    .select({ userId: users.id, name: users.name, email: users.email, role: projectMembers.role })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, project.id))
    .orderBy(asc(projectMembers.addedAt));
  const owners = members.filter((m) => m.role === "owner").length;

  return (
    <div className="space-y-5">
      <section className="card space-y-2">
        <h2 className="font-semibold">Équipe ({members.length})</h2>
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const lastOwner = m.role === "owner" && owners <= 1;
            const self = m.userId === user.id;
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.name}{self && <span className="text-muted"> (toi)</span>}</div>
                  {/* L'email n'est montré qu'aux propriétaires. */}
                  {isOwner && <div className="truncate text-xs text-muted">{m.email}</div>}
                </div>

                {isOwner ? (
                  <form action={setMemberRole} className="flex gap-2">
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="userId" value={m.userId} />
                    <select name="role" defaultValue={m.role} disabled={lastOwner} aria-label={`Rôle de ${m.name}`} className="input w-auto">
                      <option value="owner">Propriétaire</option>
                      <option value="editor">Éditeur</option>
                      <option value="viewer">Lecteur</option>
                    </select>
                    {!lastOwner && <button className="btn-ghost">OK</button>}
                  </form>
                ) : (
                  <span className="text-xs text-muted">{ROLE_LABEL[m.role]}</span>
                )}

                {!lastOwner && (isOwner || self) && (
                  <form action={removeMember}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="userId" value={m.userId} />
                    <button
                      className="text-muted hover:text-danger"
                      aria-label={self ? "Quitter le projet" : `Retirer ${m.name}`}
                      title={self ? "Quitter le projet" : "Retirer du projet"}
                    >
                      {self ? <LogOut size={16} /> : <Trash2 size={16} />}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {owners <= 1 && <p className="text-xs text-muted">Il faut au moins un propriétaire : nomme-en un autre avant de partir.</p>}
      </section>

      {isOwner && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Ajouter une personne</h2>
          <AddMemberForm projectId={project.id} />
          <p className="text-xs text-muted">
            La personne doit déjà avoir un compte Backstage. <strong className="text-fg">Éditeur</strong> : modifie le contenu.{" "}
            <strong className="text-fg">Lecteur</strong> : consulte seulement. <strong className="text-fg">Propriétaire</strong> : gère l&apos;équipe et le projet.
          </p>
        </section>
      )}
    </div>
  );
}
