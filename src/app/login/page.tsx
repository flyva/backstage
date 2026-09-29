import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Le hub de la promo 3IS.</p>
      </div>
      <div className="card"><LoginForm /></div>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ? <Link href="/register" className="text-accent underline">S&apos;inscrire</Link>
      </p>
    </main>
  );
}
