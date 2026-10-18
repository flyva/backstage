import { redirect } from "next/navigation";
import { FileCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { acceptCgu, logout } from "@/lib/actions";

export const metadata = { title: "Accepter les CGU" };

// Étape obligatoire avant tout accès (y compris pour les comptes créés via Google ou le SSO 3IS, qui n'ont pas vu de
// formulaire d'inscription avec une case à cocher). Tant que ce n'est pas accepté, requireUser() renvoie ici.
export default async function AcceptCguPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.cguAcceptedAt) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
      <div className="card space-y-3">
        <span className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent"><FileCheck size={22} /></span>
        <h1 className="text-xl font-semibold">Avant de continuer</h1>
        <p className="text-sm text-muted">
          Pour accéder à Backstage, <strong className="text-fg">{user.name}</strong>, tu dois d&apos;abord accepter les{" "}
          <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-accent underline">CGU</a>, les{" "}
          <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" className="text-accent underline">mentions légales</a> et la{" "}
          <a href="/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className="text-accent underline">politique de confidentialité</a>.
        </p>
        <form action={acceptCgu}>
          <button className="btn w-full">J&apos;ai lu et j&apos;accepte</button>
        </form>
        <form action={logout}><button className="btn-ghost w-full">Se déconnecter</button></form>
      </div>
    </main>
  );
}
