import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { microsoftEnabled } from "@/lib/microsoft";
import { googleEnabled } from "@/lib/google";
import { allowedDomainsFromEnv } from "@/lib/email-domain";
import { RegisterForm } from "@/components/forms";
import { MicrosoftButton } from "@/components/MicrosoftButton";
import { GoogleButton } from "@/components/GoogleButton";

export const metadata = { title: "Inscription" };

// Passe à true pour réafficher « S'inscrire avec Microsoft » (une fois l'application Entra ID créée).
const SHOW_MICROSOFT = false;

export default async function RegisterPage() {
  const session = await getSessionUser();
  if (session) redirect(session.status === "active" ? "/" : "/en-attente");

  // Microsoft (Office 365) est masqué pour l'instant : le code reste en place et se réactive ici (voir DEPLOY.md, section 11).
  const microsoft = SHOW_MICROSOFT && microsoftEnabled();
  const google = googleEnabled();
  const dev = process.env.NODE_ENV !== "production";
  const localRegistration = process.env.LOCAL_REGISTRATION !== "off";
  const domains = allowedDomainsFromEnv();
  const social = microsoft || google || dev;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Crée ton espace personnel.</p>
        {domains.length > 0 && (
          <p className="mt-1 text-xs text-muted">
            Inscription par mot de passe réservée aux adresses {domains.map((d) => `@${d}`).join(", ")}.
          </p>
        )}
      </div>

      <div className="card space-y-4">
        {social && (
          <div className="space-y-2">
            {microsoft && <MicrosoftButton label="S'inscrire avec Microsoft" />}
            {google ? <GoogleButton label="S'inscrire avec Google" /> : dev && <GoogleButton label="S'inscrire avec Google" disabled />}
            {google && (
              <p className="text-xs text-muted">
                Adresse de l&apos;école : accès immédiat. Compte Google personnel : ton compte est créé puis doit être validé par un administrateur.
              </p>
            )}
          </div>
        )}
        {social && localRegistration && (
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> ou avec un mot de passe <span className="h-px flex-1 bg-line" /></div>
        )}
        {localRegistration ? (
          <RegisterForm codeRequired={!!process.env.REGISTRATION_CODE} emailDomain={domains.length === 1 ? domains[0] : undefined} />
        ) : (
          !microsoft && !google && <p className="text-sm text-muted">Les inscriptions sont fermées.</p>
        )}
      </div>

      <p className="text-center text-sm text-muted">
        Déjà inscrit ? <Link href="/login" className="text-accent underline">Se connecter</Link>
      </p>
    </main>
  );
}
