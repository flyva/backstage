import { redirect } from "next/navigation";
import { Hourglass, XCircle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { RequestNoteForm } from "@/components/forms";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Accès à Backstage" };

export default async function PendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status === "active") redirect("/");
  const [row] = await db.select({ note: users.requestNote, reason: users.rejectionNote }).from(users).where(eq(users.id, user.id)).limit(1);

  // Demande refusée par un administrateur : la personne le voit à chaque connexion, avec le motif s'il y en a un.
  if (user.status === "rejected") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <div className="card space-y-3 border-danger">
          <span className="grid size-11 place-items-center rounded-xl bg-danger/15 text-danger"><XCircle size={22} /></span>
          <h1 className="text-xl font-semibold">Ta demande d&apos;accès a été refusée</h1>
          <p className="text-sm text-muted">
            Le compte <strong className="text-fg">{user.email}</strong> n&apos;a pas été accepté sur Backstage, le hub réservé à la promo 3IS.
          </p>
          {row?.reason && (
            <div>
              <div className="label">Motif indiqué par l&apos;administrateur</div>
              <p className="whitespace-pre-line rounded-lg border border-line bg-bg p-3 text-sm">{row.reason}</p>
            </div>
          )}
          <p className="text-sm text-muted">Si tu penses que c&apos;est une erreur, contacte la personne qui gère Backstage : elle peut revoir ta demande.</p>
          <form action={logout}><button className="btn-ghost">Se déconnecter</button></form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
      <div className="card space-y-3">
        <span className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent"><Hourglass size={22} /></span>
        <h1 className="text-xl font-semibold">Compte en attente de validation</h1>
        <p className="text-sm text-muted">
          Ton compte Google <strong className="text-fg">{user.email}</strong> est bien créé, mais ce n&apos;est pas une adresse de l&apos;école :
          un administrateur doit le valider avant que tu puisses accéder à Backstage.
        </p>
        <p className="text-sm text-muted">Ta demande apparaît chez les administrateurs. Laisse-leur un message pour qu&apos;ils sachent qui tu es, puis reviens te connecter : l&apos;accès s&apos;ouvrira dès la validation.</p>
        <RequestNoteForm defaultValue={row?.note ?? ""} />
        <form action={logout}><button className="btn-ghost">Se déconnecter</button></form>
      </div>
    </main>
  );
}
