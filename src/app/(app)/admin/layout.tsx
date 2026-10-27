import { requireAdmin } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

const TABS = [
  { slug: "", label: "Général" },
  { slug: "utilisateurs", label: "Utilisateurs" },
  { slug: "statistiques", label: "Statistiques" },
  { slug: "roles", label: "Rôles" },
  { slug: "filieres", label: "Filières" },
  { slug: "checklists", label: "Checklists" },
  { slug: "faq", label: "FAQ" },
  { slug: "liens", label: "Liens utiles" },
  { slug: "statuts-entreprises", label: "Statuts entreprises" },
  { slug: "quiz", label: "Quiz" },
  { slug: "nouveautes", label: "Nouveautés" },
  { slug: "wiki", label: "Wiki" },
  { slug: "sauvegardes", label: "Sauvegardes" },
  { slug: "rgpd", label: "RGPD" },
  { slug: "audit", label: "Journal d'audit" },
  { slug: "sante", label: "Santé" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Administration</h1>
      <ProjectTabs base="/admin" tabs={TABS} label="Sections de l'administration" />
      {children}
    </div>
  );
}
