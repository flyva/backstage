"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FilePlus2 } from "lucide-react";
import { childrenMap, type TreePage } from "@/lib/wiki";

// Menu de gauche du wiki : les catégories, leurs pages et sous-pages. La page en cours est en surbrillance et son
// chemin reste ouvert. Sur téléphone, le menu passe au-dessus du contenu, replié.
export function WikiSidebar({ pages }: { pages: TreePage[] }) {
  const pathname = usePathname();
  if (pathname === "/wiki") return null; // l'accueil du wiki a déjà la liste complète
  const current = decodeURIComponent(pathname.split("/")[2] ?? "");

  const kids = childrenMap(pages);
  const ids = new Set(pages.map((p) => p.id));
  const roots = pages.filter((p) => p.parentId === null || !ids.has(p.parentId));
  const byCat = Map.groupBy([...roots].sort((a, b) => a.title.localeCompare(b.title, "fr")), (p) => p.category);
  const bySlug = new Map(pages.map((p) => [p.slug, p]));

  // Chemin de la page en cours : toutes ses pages parentes restent dépliées.
  const open = new Set<number>();
  for (let p = bySlug.get(current); p; p = p.parentId !== null ? pages.find((x) => x.id === p!.parentId) : undefined) open.add(p.id);
  const currentCategory = bySlug.get(current)?.category;

  const node = (p: TreePage, depth: number): React.ReactNode => {
    const children = kids.get(p.id) ?? [];
    const active = p.slug === current;
    return (
      <li key={p.id}>
        <Link
          href={`/wiki/${p.slug}`}
          aria-current={active ? "page" : undefined}
          className={`block rounded-lg px-2 py-1 text-sm ${active ? "bg-accent font-medium text-accent-fg" : "text-muted hover:bg-bg hover:text-fg"}`}
          style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        >
          {p.title}
        </Link>
        {children.length > 0 && (active || open.has(p.id)) && <ul className="space-y-0.5">{children.map((c) => node(c, depth + 1))}</ul>}
      </li>
    );
  };

  const menu = (
    <nav aria-label="Menu du wiki" className="space-y-3">
      <Link href="/wiki" className="block text-xs font-semibold uppercase tracking-wide text-muted hover:text-fg">Tout le wiki</Link>
      {[...byCat].map(([cat, list]) => (
        <details key={cat} open={cat === currentCategory} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-1 text-sm font-semibold marker:hidden hover:bg-bg">
            <span className="truncate">{cat}</span>
            <ChevronDown size={14} className="shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="mt-1 space-y-0.5">{list.map((p) => node(p, 0))}</ul>
        </details>
      ))}
      <Link href="/wiki/nouveau" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted hover:bg-bg hover:text-fg"><FilePlus2 size={13} /> Nouvelle page</Link>
    </nav>
  );

  return (
    <>
      <details className="card lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">Menu du wiki</summary>
        <div className="pt-3">{menu}</div>
      </details>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 print:hidden">
        <div className="sticky top-20 slim-scroll max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-3">{menu}</div>
      </aside>
    </>
  );
}
