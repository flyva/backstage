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
