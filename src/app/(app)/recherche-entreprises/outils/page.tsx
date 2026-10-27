import { Wrench } from "lucide-react";
import { ResourceCategoryPage } from "@/components/ResourceCategoryPage";

export const metadata = { title: "Outils & IA · Recherche entreprises" };

export default function OutilsPage() {
  return <ResourceCategoryPage category="outils" icon={Wrench} />;
}
