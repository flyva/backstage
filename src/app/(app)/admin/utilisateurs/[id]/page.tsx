import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Building2, Mail, Phone, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { roles, tracks, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { AnonymizeUserForm, DeleteUserForm, ResetPasswordForm, UserEditForm } from "@/components/admin-user-forms";

export const metadata = { title: "Modifier une personne" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long" });

export default async function EditUserPage({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const uid = Number(id);
  if (!Number.isInteger(uid)) notFound();
  const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!user) notFound();
  if (user.id !== admin.id) await logAdminAction(admin.id, "view", user.id, user.name); // pas la peine de tracer la consultation de sa propre fiche
  const allRoles = await db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(asc(roles.name));
  const [track] = user.trackId ? await db.select({ name: tracks.name }).from(tracks).where(eq(tracks.id, user.trackId)).limit(1) : [];
  const ssoLinked = !!user.googleSub || !!user.msOid;
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
        <UserEditForm user={{ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, roleId: user.roleId, status: user.status }} roles={allRoles} isSelf={user.id === admin.id} ssoLinked={ssoLinked} />
      </section>

      <section className="card space-y-3">
        <h3 className="font-semibold">Détails</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {user.phone && <div className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-muted" aria-hidden /><dd>{user.phone}</dd></div>}
          {user.companyName && <div className="flex items-center gap-2"><Building2 size={14} className="shrink-0 text-muted" aria-hidden /><dd>{user.companyName}</dd></div>}
          {user.contactEmail && <div className="flex items-center gap-2"><Mail size={14} className="shrink-0 text-muted" aria-hidden /><dd>{user.contactEmail}</dd></div>}
          {user.habilitation && <div className="flex items-center gap-2"><ShieldCheck size={14} className="shrink-0 text-muted" aria-hidden /><dd>Habilitation {user.habilitation}</dd></div>}
          {track && <div><dt className="inline text-muted">Filière : </dt><dd className="inline">{track.name}</dd></div>}
          {user.headline && <div className="sm:col-span-2"><dt className="inline text-muted">Poste : </dt><dd className="inline">{user.headline}</dd></div>}
        </dl>
        {!user.phone && !user.companyName && !user.contactEmail && !user.habilitation && !track && !user.headline && (
          <p className="text-sm text-muted">Rien de renseigné dans le profil pour l&apos;instant.</p>
        )}
        {user.requestNote && (
          <div className="rounded-lg border border-line bg-bg p-3">
            <p className="text-xs font-medium text-muted">Message de la demande d&apos;inscription</p>
            <p className="mt-1 whitespace-pre-line text-sm">{user.requestNote}</p>
          </div>
        )}
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
          <p className="text-sm text-muted">Pour empêcher quelqu&apos;un de se connecter en gardant ses projets et ses contenus, passe son statut sur « Désactivé ». La suppression est définitive et n&apos;est possible que si la personne n&apos;a rien créé : sinon, anonymise-la (son nom et ses coordonnées disparaissent, ses messages et avis restent sans être identifiables).</p>
          <DeleteUserForm id={user.id} name={user.name} />
          <div className="border-t border-line pt-3">
            <AnonymizeUserForm id={user.id} name={user.name} />
          </div>
        </section>
      )}
    </div>
  );
}
