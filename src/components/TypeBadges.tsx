import { TYPE_LABEL, type CompanyType } from "@/lib/company-search";

export function TypeBadges({ types }: { types: string }) {
  const list = types.split(",").filter(Boolean) as CompanyType[];
  if (list.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((t) => <span key={t} className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium">{TYPE_LABEL[t]}</span>)}
    </span>
  );
}
