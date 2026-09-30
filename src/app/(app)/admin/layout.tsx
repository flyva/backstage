import { requireAdmin } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

const TABS = [
  { slug: "", label: "Général" },
  { slug: "utilisateurs", label: "Utilisateurs" },
  { slug: "roles", label: "Rôles" },
  { slug: "filieres", label: "Filières" },
  { slug: "checklists", label: "Checklists" },
  { slug: "faq", label: "FAQ" },
  { slug: "liens", label: "Liens utiles" },
  { slug: "wiki", label: "Wiki" },
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
