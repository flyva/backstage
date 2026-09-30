import { childrenMap, type TreePage } from "@/lib/wiki";

/** Liste indentée « Catégorie › Parent › Page » pour choisir une page parente. */
export function parentChoices(pages: TreePage[]): { id: number; label: string }[] {
  const kids = childrenMap(pages);
  const ids = new Set(pages.map((p) => p.id));
  const roots = pages.filter((p) => p.parentId === null || !ids.has(p.parentId)).sort((a, b) => a.category.localeCompare(b.category, "fr") || a.title.localeCompare(b.title, "fr"));
  const out: { id: number; label: string }[] = [];
  const walk = (p: TreePage, prefix: string) => {
    const label = `${prefix}${p.title}`;
    out.push({ id: p.id, label });
    for (const c of kids.get(p.id) ?? []) walk(c, `${label} › `);
  };
  for (const r of roots) walk(r, `${r.category} › `);
  return out;
}
