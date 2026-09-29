import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { Newspaper, Pin } from "lucide-react";
import { db } from "@/db";
import { newsPosts, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canPublish, SCOPE_LABEL } from "@/lib/news";

export const metadata = { title: "Actualités" };

const PAGE_SIZE = 10;
const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" });

const plainExcerpt = (md: string) => {
  const t = md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#*_`>~|-]/g, "").replace(/\s+/g, " ").trim();
  return t.length > 200 ? `${t.slice(0, 200)}…` : t;
};

export default async function ActusPage({ searchParams }: PageProps<"/actus">) {
  const user = await requireUser();
  const sp = await searchParams;
  const scope = sp.rubrique === "ecole" || sp.rubrique === "bde" ? sp.rubrique : undefined;
  const page = Math.max(1, Math.floor(Number(sp.p) || 1));

  const where = scope ? eq(newsPosts.scope, scope) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(newsPosts).where(where);
  const posts = await db
    .select({ post: newsPosts, author: users.name })
    .from(newsPosts)
    .innerJoin(users, eq(users.id, newsPosts.authorId))
    .where(where)
    .orderBy(desc(newsPosts.pinned), desc(newsPosts.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => `/actus?${new URLSearchParams({ ...(scope ? { rubrique: scope } : {}), ...(p > 1 ? { p: String(p) } : {}) })}`;

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Actualités</h1>
          <p className="text-sm text-muted">Les infos de l&apos;école et du BDE.</p>
        </div>
        {canPublish(user) && <Link href="/actus/nouveau" className="btn"><Newspaper size={16} /> Écrire un article</Link>}
      </header>

      <nav className="flex gap-2" aria-label="Rubriques">
        {[["", "Tout"], ["ecole", "École"], ["bde", "BDE"]].map(([v, label]) => (
          <Link
            key={v}
            href={v ? `/actus?rubrique=${v}` : "/actus"}
            className={`rounded-lg border px-3 py-1 text-sm ${(scope ?? "") === v ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-fg"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {posts.length === 0 && <p className="text-sm text-muted">Aucun article pour le moment.</p>}

      <ul className="space-y-3">
        {posts.map(({ post, author }) => (
          <li key={post.id}>
            <Link href={`/actus/${post.id}`} className="card block space-y-1.5 hover:border-accent">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {post.pinned && <span className="flex items-center gap-1 text-accent"><Pin size={12} /> Épinglé</span>}
                <span className="rounded-md border border-line px-1.5 py-0.5">{SCOPE_LABEL[post.scope]}</span>
                <span>{dateFmt.format(post.createdAt)} · {author}</span>
              </div>
              <h2 className="text-lg font-semibold leading-snug">{post.title}</h2>
              <p className="text-sm text-muted">{plainExcerpt(post.body)}</p>
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={qs(page - 1)} className="btn-ghost">← Plus récents</Link> : <span />}
          <span className="text-muted">Page {page} / {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="btn-ghost">Plus anciens →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
