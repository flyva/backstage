import Link from "next/link";
import { VerifyForm } from "@/components/reset-forms";

export const metadata = { title: "Activer mon compte" };

export default async function VerifyPage({ searchParams }: PageProps<"/verifier">) {
  const t = (await searchParams).token;
  const token = typeof t === "string" && /^[a-f0-9]{64}$/.test(t) ? t : "";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <div className="text-3xl font-bold tracking-tight">Back<span className="text-accent">stage</span></div>
        <p className="text-sm text-muted">Activer mon compte</p>
      </div>
      <div className="card space-y-4">
        {token ? (
          <VerifyForm token={token} />
        ) : (
          <p className="text-sm text-danger" role="alert">Ce lien est invalide. <Link href="/register" className="font-medium text-fg underline">Refaire l&apos;inscription</Link>.</p>
        )}
      </div>
      <p className="text-center text-sm text-muted"><Link href="/login" className="font-medium text-fg underline">Retour à la connexion</Link></p>
    </main>
  );
}
