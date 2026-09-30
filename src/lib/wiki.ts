// Partagé entre serveur et client (aperçu de l'éditeur) : aucune dépendance serveur ici.

export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "page"
  );
}

/** [[Titre de page]] ou [[Titre|texte affiché]] → lien Markdown vers /wiki/<slug>. */
export function expandWikiLinks(md: string): string {
  return md.replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (_, title: string, label?: string) => {
    return `[${(label ?? title).trim()}](/wiki/${slugify(title)})`;
  });
}

// ---------- Arborescence (pages et sous-pages) ----------

export type TreePage = { id: number; slug: string; title: string; category: string; parentId: number | null };

/** Sous-pages directes, par identifiant de page parente (triées par titre). */
export function childrenMap<T extends TreePage>(pages: T[]): Map<number, T[]> {
  const m = new Map<number, T[]>();
  for (const p of [...pages].sort((a, b) => a.title.localeCompare(b.title, "fr"))) {
    if (p.parentId !== null) m.set(p.parentId, [...(m.get(p.parentId) ?? []), p]);
  }
  return m;
}

/** Identifiants de toutes les sous-pages (à tous les niveaux) d'une page. */
export function descendantIds(pages: TreePage[], id: number): Set<number> {
  const kids = childrenMap(pages);
  const out = new Set<number>();
  const walk = (i: number) => { for (const c of kids.get(i) ?? []) if (!out.has(c.id)) { out.add(c.id); walk(c.id); } };
  walk(id);
  return out;
}

/** Chaîne des pages parentes, de la plus haute à la plus proche. */
export function ancestors<T extends TreePage>(pages: T[], page: T): T[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const out: T[] = [];
  const seen = new Set<number>([page.id]);
  let cur = page.parentId !== null ? byId.get(page.parentId) : undefined;
  while (cur && !seen.has(cur.id)) { out.unshift(cur); seen.add(cur.id); cur = cur.parentId !== null ? byId.get(cur.parentId) : undefined; }
  return out;
}
