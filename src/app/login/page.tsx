import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { microsoftEnabled } from "@/lib/microsoft";
import { googleEnabled } from "@/lib/google";
import { allowedDomainsFromEnv } from "@/lib/email-domain";
import { LoginForm } from "@/components/forms";
import { MicrosoftButton } from "@/components/MicrosoftButton";
import { GoogleButton } from "@/components/GoogleButton";

export const metadata = { title: "Connexion" };

// Passe à true pour réafficher « Se connecter avec Microsoft » (une fois l'application Entra ID créée).
const SHOW_MICROSOFT = false;

const ERRORS: Record<string, string> = {
  "organisation-refusee": "Ce compte Microsoft n'appartient pas à une organisation autorisée à utiliser Backstage.",
  "domaine-refuse": "Ce compte Microsoft n'a pas une adresse d'un domaine autorisé : seules les adresses de l'école peuvent se connecter avec Microsoft.",
  "microsoft-refuse": "La connexion Microsoft a été refusée ou annulée. Si ton organisation bloque l'application, demande à ton service informatique de l'autoriser.",
  "microsoft-echec": "La connexion Microsoft a échoué. Réessaie dans un instant.",
  "microsoft-indisponible": "La connexion Microsoft n'est pas configurée sur ce serveur.",
  "google-refuse": "La connexion Google a été annulée.",
  "google-echec": "La connexion Google a échoué. Réessaie dans un instant.",
  "google-email-non-verifie": "Google n'a pas vérifié l'adresse de ce compte : impossible de l'utiliser.",
  "google-indisponible": "La connexion Google n'est pas configurée sur ce serveur.",
  "session-expiree": "La connexion a expiré. Recommence depuis le bouton.",
  "trop-de-tentatives": "Trop de tentatives : réessaie dans quelques minutes.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Un compte « en attente » a une session mais pas d'accès : on l'envoie sur sa page d'attente.
  const session = await getSessionUser();
  if (session) redirect(session.status === "active" ? "/" : "/en-attente");

  const erreur = (await searchParams).erreur;
  const message = typeof erreur === "string" ? ERRORS[erreur] : undefined;
  // Microsoft (Office 365) est masqué pour l'instant : le code reste en place et se réactive ici (voir DEPLOY.md, section 11).
  const microsoft = SHOW_MICROSOFT && microsoftEnabled();
  const google = googleEnabled();
  const dev = process.env.NODE_ENV !== "production";
  const localRegistration = process.env.LOCAL_REGISTRATION !== "off";
  const social = microsoft || google || dev;
  // Un seul domaine autorisé (ex. 3is.fr) : on l'affiche déjà dans le champ email.
  const domains = allowedDomainsFromEnv();
  const emailDomain = domains.length === 1 ? domains[0] : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Le hub de la promo 3IS.</p>
      </div>

      {message && <div className="card border-danger text-sm" role="alert">{message}</div>}
      {(await searchParams).reinitialise === "1" && <div className="card border-green-600 text-sm" role="status">Mot de passe changé : connecte-toi avec le nouveau.</div>}

      <div className="card space-y-4">
        {social && (
          <div className="space-y-2">
            {microsoft && <MicrosoftButton />}
            {google ? <GoogleButton /> : dev && <GoogleButton disabled />}
          </div>
        )}
        {social && (
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> ou avec un mot de passe <span className="h-px flex-1 bg-line" /></div>
        )}
        <LoginForm emailDomain={emailDomain} />
        <p className="text-center text-xs"><Link href="/mot-de-passe-oublie" className="text-muted underline hover:text-fg">Mot de passe oublié ?</Link></p>
      </div>

      {(localRegistration || microsoft || google) && (
        <p className="text-center text-sm text-muted">
          Pas encore de compte ? <Link href="/register" className="font-medium text-fg underline">S&apos;inscrire</Link>
        </p>
      )}
    </main>
  );
}
