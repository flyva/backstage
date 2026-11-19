import { requireInventoryViewer } from "@/lib/inventory";
import { ProjectTabs } from "@/components/ProjectTabs";

export default async function InventaireLayout({ children }: LayoutProps<"/inventaire">) {
  await requireInventoryViewer();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Inventaire</h1>
        <p className="text-sm text-muted">Stocks, adresses et dates de péremption (DLC).</p>
      </header>
      <ProjectTabs
        base="/inventaire"
        tabs={[
          { slug: "", label: "Stock" },
          { slug: "produits", label: "Produits" },
          { slug: "parametres", label: "Paramètres" },
        ]}
      />
      {children}
    </div>
  );
}
