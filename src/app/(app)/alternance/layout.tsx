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
  // Mêmes pages que celles qu'un rôle peut masquer une à une dans le menu principal (Administration → Rôles → Pages
  // du menu) : si « Pointeuse » ou « Notes de frais » est décoché là-bas (ou tout, pour un rôle « Entreprise »), cet
  // onglet ne doit pas non plus apparaître ici. Un seul onglet restant (Planning) ne vaut pas la peine d'être montré.
  const hidden = new Set(user.perms.hiddenPages);
  const tabs = TABS.filter((t) => !hidden.has(t.slug ? `/alternance/${t.slug}` : "/alternance"));
  return (
    <div className="space-y-5">
      <div className="space-y-5 print:hidden">
        <h1 className="text-2xl font-bold">Alternance</h1>
        {tabs.length > 1 && <ProjectTabs base="/alternance" tabs={tabs} label="Sections de l'alternance" />}
      </div>
      {children}
    </div>
  );
}
