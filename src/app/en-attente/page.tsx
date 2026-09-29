import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions";

export const metadata = { title: "En attente de validation" };

export default async function PendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status === "active") redirect("/");

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
        <p className="text-sm text-muted">Préviens la personne qui gère Backstage, puis reviens te connecter : l&apos;accès s&apos;ouvrira dès la validation.</p>
        <form action={logout}><button className="btn-ghost">Se déconnecter</button></form>
      </div>
    </main>
  );
}
