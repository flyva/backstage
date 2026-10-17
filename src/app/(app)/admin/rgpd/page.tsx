import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LegalTextsForm } from "@/components/forms";

export const metadata = { title: "RGPD" };

export default async function RgpdAdminPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-accent" /> CGU et mentions légales</h2>
        <p className="text-sm text-muted">Affichées publiquement sur <Link href="/cgu" className="text-accent underline">/cgu</Link> et <Link href="/mentions-legales" className="text-accent underline">/mentions-legales</Link>, accessibles sans compte (liées depuis la connexion et l&apos;inscription).</p>
        <LegalTextsForm cguBody={settings.cgu_body ?? ""} mentionsBody={settings.mentions_legales_body ?? ""} />
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Données personnelles</h2>
        <ul className="space-y-1.5 text-sm text-muted">
          <li>• Chaque personne peut exporter ses propres données depuis <Link href="/profil" className="text-accent underline">son profil</Link> (onglet Général).</li>
          <li>• Supprimer un compte : <Link href="/admin/utilisateurs" className="text-accent underline">Utilisateurs</Link>, fiche de la personne, zone dangereuse. Impossible si elle a créé des projets ou du contenu partagé : désactive plutôt son accès (statut « Désactivé »).</li>
          <li>• Les sauvegardes (<Link href="/admin/sauvegardes" className="text-accent underline">Sauvegardes</Link>) contiennent les mêmes données : une suppression de compte n&apos;efface pas rétroactivement les sauvegardes déjà faites.</li>
        </ul>
      </section>
    </div>
  );
}
