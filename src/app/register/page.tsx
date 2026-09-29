import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { microsoftEnabled } from "@/lib/microsoft";
import { RegisterForm } from "@/components/forms";
import { MicrosoftButton } from "@/components/MicrosoftButton";

export const metadata = { title: "Inscription" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/");
  const microsoft = microsoftEnabled();
  const localRegistration = process.env.LOCAL_REGISTRATION !== "off";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Crée ton espace personnel.</p>
      </div>

      <div className="card space-y-4">
        {microsoft && (
          <>
            <MicrosoftButton label="S'inscrire avec Microsoft" />
            <p className="text-xs text-muted">Utilise ton compte Office 365 de l&apos;école : ton compte Backstage est créé automatiquement.</p>
          </>
        )}
        {microsoft && localRegistration && (
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> ou avec un mot de passe <span className="h-px flex-1 bg-line" /></div>
        )}
        {localRegistration ? (
          <RegisterForm codeRequired={!!process.env.REGISTRATION_CODE} />
        ) : (
          !microsoft && <p className="text-sm text-muted">Les inscriptions sont fermées.</p>
        )}
      </div>

      <p className="text-center text-sm text-muted">
        Déjà inscrit ? <Link href="/login" className="text-accent underline">Se connecter</Link>
      </p>
    </main>
  );
}
