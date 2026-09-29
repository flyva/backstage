import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { microsoftEnabled } from "@/lib/microsoft";
import { LoginForm } from "@/components/forms";
import { MicrosoftButton } from "@/components/MicrosoftButton";

export const metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  "organisation-refusee": "Ce compte Microsoft n'appartient pas à une organisation autorisée à utiliser Backstage.",
  "domaine-refuse": "Ce compte Microsoft n'a pas une adresse d'un domaine autorisé : seules les adresses de l'école peuvent se connecter.",
  "microsoft-refuse": "La connexion Microsoft a été refusée ou annulée. Si ton organisation bloque l'application, demande à ton service informatique de l'autoriser.",
  "microsoft-echec": "La connexion Microsoft a échoué. Réessaie dans un instant.",
  "microsoft-indisponible": "La connexion Microsoft n'est pas configurée sur ce serveur.",
  "session-expiree": "La connexion Microsoft a expiré. Recommence depuis le bouton.",
  "trop-de-tentatives": "Trop de tentatives : réessaie dans quelques minutes.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUser()) redirect("/");
  const erreur = (await searchParams).erreur;
  const message = typeof erreur === "string" ? ERRORS[erreur] : undefined;
  const microsoft = microsoftEnabled();
  const localRegistration = process.env.LOCAL_REGISTRATION !== "off";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Le hub de la promo 3IS.</p>
      </div>

      {message && <div className="card border-danger text-sm" role="alert">{message}</div>}

      <div className="card space-y-4">
        {!microsoft && process.env.NODE_ENV !== "production" && (
          <>
            <MicrosoftButton disabled />
            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> ou avec un mot de passe <span className="h-px flex-1 bg-line" /></div>
          </>
        )}
        {microsoft && (
          <>
            <MicrosoftButton />
            <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> ou avec un mot de passe <span className="h-px flex-1 bg-line" /></div>
          </>
        )}
        <LoginForm />
      </div>

      {(localRegistration || microsoft) && (
        <p className="text-center text-sm text-muted">
          Pas encore de compte ? <Link href="/register" className="text-accent underline">S&apos;inscrire</Link>
        </p>
      )}
    </main>
  );
}
