import { Megaphone } from "lucide-react";
import { ResourceCategoryPage } from "@/components/ResourceCategoryPage";

export const metadata = { title: "Sites carrières · Recherche entreprises" };

export default function SitesCarrieresPage() {
  return <ResourceCategoryPage category="sites_carrieres" icon={Megaphone} />;
}
