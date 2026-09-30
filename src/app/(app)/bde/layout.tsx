import { requireModule } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

export default async function BdeLayout({ children }: LayoutProps<"/bde">) {
  await requireModule("bde");
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">BDE</h1>
        <p className="text-sm text-muted">Évènements, sondages et boîte à idées du Bureau des étudiants.</p>
      </header>
      <ProjectTabs
        base="/bde"
        tabs={[
          { slug: "", label: "Évènements" },
          { slug: "sondages", label: "Sondages" },
          { slug: "idees", label: "Boîte à idées" },
        ]}
      />
      {children}
    </div>
  );
}
