import Link from "next/link";
import { Building2, CircleHelp, Globe, Laptop, Mail, Megaphone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Démarchage entreprise" };

// Point d'entrée en administration pour tout ce que la page Démarchage entreprise propose déjà en partage libre
// (n'importe qui peut compléter sites ressources/jobboards/sites carrières/banque de mails) : regroupe l'import CSV
// (jusqu'ici sur l'annuaire public) et des accès directs vers chaque page de gestion.
export default async function AdminDemarchagePage() {
  await requireAdmin();
  const pages = [
    { href: "/recherche-entreprises/annuaire", label: "Annuaire d'entreprises", hint: "Voir, ajouter, publier ou supprimer une entreprise", icon: Building2 },
    { href: "/recherche-entreprises/sites-ressources", label: "Sites ressources", hint: "Liens partagés par catégorie", icon: Globe },
    { href: "/recherche-entreprises/jobboards", label: "Jobboards", hint: "Liens partagés par catégorie", icon: Laptop },
    { href: "/recherche-entreprises/sites-carrieres", label: "Sites carrières", hint: "Liens partagés par catégorie", icon: Megaphone },
    { href: "/recherche-entreprises/banque-mails", label: "Banque de mails", hint: "Adresses de contact partagées", icon: Mail },
    { href: "/faq", label: "FAQ", hint: "Questions fréquentes (catégorie « Démarchage »), gérée dans Administration > FAQ", icon: CircleHelp },
  ];
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Démarchage entreprise</h1>
        <p className="text-sm text-muted">Import de l&apos;annuaire et accès aux pages de ressources partagées de la recherche d&apos;alternance/stage.</p>
      </header>

      <section className="card space-y-3">
        <h2 className="font-semibold">Import de l&apos;annuaire</h2>
        <p className="text-sm text-muted">L&apos;import CSV se fait désormais ici plutôt que sur l&apos;annuaire public.</p>
        <Link href="/admin/demarchage/annuaire" className="btn w-fit">Importer un CSV</Link>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Pages de la recherche d&apos;alternance/stage</h2>
        <p className="text-sm text-muted">Chacune reste modifiable par tous (ajout/suppression) directement depuis sa page ; ces liens permettent d&apos;y accéder depuis l&apos;administration.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {pages.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-accent">
                <p.icon size={18} className="shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.label}</span>
                  <span className="block truncate text-xs text-muted">{p.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
