import { requireUser } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

export default async function SettingsLayout({ children }: LayoutProps<"/parametres">) {
  await requireUser();
  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted">Personnalise ton espace, règle tes notifications et protège ton compte.</p>
      </header>
      <ProjectTabs
        base="/parametres"
        tabs={[
          { slug: "", label: "Personnalisation" },
          { slug: "notifications", label: "Notifications" },
          { slug: "securite", label: "Sécurité" },
        ]}
      />
      {children}
    </div>
  );
}
