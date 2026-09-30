import { requireUser } from "@/lib/auth";
import { ProjectTabs } from "@/components/ProjectTabs";

const TABS = [
  { slug: "", label: "Appareils" },
  { slug: "memoires", label: "Mémoires et scènes" },
];

export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Bibliothèque</h1>
        <p className="text-sm text-muted">Ce que la promo réutilise d&apos;un projet à l&apos;autre : modèles de projecteurs et mémoires de console. Tout le monde peut contribuer.</p>
      </div>
      <ProjectTabs base="/bibliotheque" tabs={TABS} label="Sections de la bibliothèque" />
      {children}
    </div>
  );
}
