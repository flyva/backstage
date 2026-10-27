import { Laptop } from "lucide-react";
import { ResourceCategoryPage } from "@/components/ResourceCategoryPage";

export const metadata = { title: "Jobboards · Recherche entreprises" };

export default function JobboardsPage() {
  return <ResourceCategoryPage category="jobboards" icon={Laptop} />;
}
