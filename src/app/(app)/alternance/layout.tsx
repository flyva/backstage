import { requireUser } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

const TABS = [
  { slug: "", label: "Planning" },
  { slug: "carnet", label: "Carnet de liaison" },
];

export default async function AlternanceLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Alternance</h1>
      <ProjectTabs base="/alternance" tabs={TABS} label="Sections de l'alternance" />
      {children}
    </div>
  );
}
