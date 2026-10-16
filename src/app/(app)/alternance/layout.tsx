import { requireUser } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

const TABS = [
  { slug: "", label: "Planning" },
  { slug: "carnet", label: "Carnet de compétences" },
  { slug: "pointeuse", label: "Pointeuse" },
  { slug: "stats", label: "Statistiques" },
];

export default async function AlternanceLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="space-y-5">
      <div className="space-y-5 print:hidden">
        <h1 className="text-2xl font-bold">Alternance</h1>
        <ProjectTabs base="/alternance" tabs={TABS} label="Sections de l'alternance" />
      </div>
      {children}
    </div>
  );
}
