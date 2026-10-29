import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Connexion externe" };

const ERRORS: Record<string, string> = {
  "trop-de-tentatives": "Trop de tentatives : réessaie dans quelques minutes.",
};

// Page de connexion séparée pour les comptes externes (entreprise d'accueil, tuteur, intervenant…) : une adresse
// et un mot de passe donnés par un administrateur (voir Administration → Utilisateurs → Créer un compte), pas de
// compte Google ni d'adresse de l'école. Même formulaire que /login, mais sans les boutons Google/Microsoft ni le
// lien d'inscription, qui ne concernent pas ces comptes.
export default async function ExternalLoginPage({ searchParams }: PageProps<"/connexion-externe">) {
  const session = await getSessionUser();
  if (session) redirect(session.status === "active" ? "/" : "/en-attente");

  const erreur = (await searchParams).erreur;
  const message = typeof erreur === "string" ? ERRORS[erreur] : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <Link href="/login" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Connexion</Link>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Connexion externe : entreprise d&apos;accueil, tuteur, intervenant…</p>
      </div>

      {message && <div className="card border-danger text-sm" role="alert">{message}</div>}
      {(await searchParams).reinitialise === "1" && <div className="card border-green-600 text-sm" role="status">Mot de passe changé : connecte-toi avec le nouveau.</div>}

      <div className="card space-y-4">
        <p className="text-sm text-muted">Connecte-toi avec l&apos;adresse et le mot de passe qu&apos;un administrateur t&apos;a transmis.</p>
        <LoginForm />
        <p className="text-center text-xs"><Link href="/mot-de-passe-oublie" className="text-muted underline hover:text-fg">Mot de passe oublié ?</Link></p>
      </div>
      <Footer />
    </main>
  );
}
