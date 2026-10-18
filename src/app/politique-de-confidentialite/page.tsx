import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Markdown } from "@/components/Markdown";
import { LegalNav } from "@/components/LegalNav";

export const metadata = { title: "Politique de confidentialité" };

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const body = settings.politique_confidentialite_body?.trim();
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Accueil</Link>
      <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
      <LegalNav current="/politique-de-confidentialite" />
      {body ? <Markdown breaks>{body}</Markdown> : <p className="text-sm text-muted">Cette page n&apos;a pas encore été rédigée.</p>}
    </main>
  );
}
