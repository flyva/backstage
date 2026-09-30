import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { DeleteUserForm, ResetPasswordForm, UserEditForm } from "@/components/admin-user-forms";

export const metadata = { title: "Modifier une personne" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long" });

export default async function EditUserPage({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const uid = Number(id);
  if (!Number.isInteger(uid)) notFound();
  const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!user) notFound();
  const allRoles = await db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(asc(roles.name));
  const signIn = user.googleSub ? "Google" : user.msOid ? "Microsoft" : "Mot de passe";

  return (
    <div className="space-y-6">
      <Link href="/admin/utilisateurs" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Utilisateurs</Link>
      <header>
        <h2 className="text-xl font-semibold">{user.name}</h2>
        <p className="text-sm text-muted">Compte créé le {dateFmt.format(user.createdAt)} · connexion par {signIn}</p>
      </header>

      <section className="card space-y-3">
        <h3 className="font-semibold">Informations, rôle et statut</h3>
        <UserEditForm user={{ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, roleId: user.roleId, status: user.status }} roles={allRoles} isSelf={user.id === admin.id} />
      </section>

      {!user.googleSub && !user.msOid && (
        <section className="card space-y-3">
          <h3 className="font-semibold">Mot de passe</h3>
          <p className="text-sm text-muted">Définis un nouveau mot de passe et communique-le à la personne. Ses appareils connectés seront déconnectés.</p>
          <ResetPasswordForm id={user.id} />
        </section>
      )}

      {user.id !== admin.id && (
        <section className="card space-y-3 border-danger/40">
          <h3 className="font-semibold text-danger">Zone dangereuse</h3>
          <p className="text-sm text-muted">Pour empêcher quelqu&apos;un de se connecter en gardant ses projets et ses contenus, passe son statut sur « Désactivé ». La suppression est définitive et n&apos;est possible que si la personne n&apos;a rien créé.</p>
          <DeleteUserForm id={user.id} name={user.name} />
        </section>
      )}
    </div>
  );
}
