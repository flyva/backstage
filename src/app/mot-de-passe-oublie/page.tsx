import Link from "next/link";
import { ForgotForm } from "@/components/reset-forms";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Mot de passe oublié</p>
      </div>
      <div className="card space-y-4">
        <p className="text-sm text-muted">Entre l&apos;adresse de ton compte : tu reçois un lien pour choisir un nouveau mot de passe.</p>
        <ForgotForm />
      </div>
      <p className="text-center text-sm text-muted"><Link href="/login" className="text-accent underline">Retour à la connexion</Link></p>
    </main>
  );
}
