import { requireUser } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

const TABS = [
  { slug: "", label: "Planning" },
  { slug: "carnet", label: "Journal de bord" },
  { slug: "pointeuse", label: "Pointeuse" },
  { slug: "stats", label: "Statistiques" },
  { slug: "notes-de-frais", label: "Notes de frais" },
];

export default async function AlternanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Rôle « Entreprise » : seul le planning est accessible (voir COMPANY_ALLOWED_PATHS), les autres onglets n'ont pas lieu d'être proposés.
  const tabs = user.perms.companyOnly ? TABS.filter((t) => t.slug === "") : TABS;
  return (
    <div className="space-y-5">
      <div className="space-y-5 print:hidden">
        <h1 className="text-2xl font-bold">Alternance</h1>
        <ProjectTabs base="/alternance" tabs={tabs} label="Sections de l'alternance" />
      </div>
      {children}
    </div>
  );
}
