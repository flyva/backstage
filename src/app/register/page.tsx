import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { RegisterForm } from "@/components/forms";

export const metadata = { title: "Inscription" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Crée ton espace personnel.</p>
      </div>
      <div className="card"><RegisterForm /></div>
      <p className="text-center text-sm text-muted">
        Déjà inscrit ? <Link href="/login" className="text-accent underline">Se connecter</Link>
      </p>
    </main>
  );
}
