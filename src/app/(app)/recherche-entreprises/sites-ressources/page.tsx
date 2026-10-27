import { Globe } from "lucide-react";
import { ResourceCategoryPage } from "@/components/ResourceCategoryPage";

export const metadata = { title: "Sites ressources · Recherche entreprises" };

export default function SitesRessourcesPage() {
  return <ResourceCategoryPage category="sites_ressources" icon={Globe} />;
}
