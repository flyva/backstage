import type { LucideIcon } from "lucide-react";
import { loadResourceLinks } from "@/lib/resource-links-data";
import { RESOURCE_CATEGORY_HINT, RESOURCE_CATEGORY_LABEL, type ResourceCategory } from "@/lib/resource-links";
import { ResourceLinkList } from "@/components/ResourceLinkList";

export async function ResourceCategoryPage({ category, icon: Icon }: { category: ResourceCategory; icon: LucideIcon }) {
  const links = await loadResourceLinks(category);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Icon size={22} className="text-accent" /> {RESOURCE_CATEGORY_LABEL[category]}</h1>
        <p className="text-sm text-muted">{RESOURCE_CATEGORY_HINT[category]}</p>
      </header>
      <ResourceLinkList category={category} links={links} />
    </div>
  );
}
