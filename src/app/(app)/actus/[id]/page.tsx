import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Pencil } from "lucide-react";
import { db } from "@/db";
import { newsPosts, users } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { canPublish, SCOPE_LABEL } from "@/lib/news";
import { deleteNews } from "@/lib/news-actions";
import { Markdown } from "@/components/Markdown";
import { ConfirmButton } from "@/components/ConfirmButton";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });

export default async function ActuPage({ params }: PageProps<"/actus/[id]">) {
  const user = await requireModule("actus");
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();
  const [row] = await db
    .select({ post: newsPosts, author: users.name })
    .from(newsPosts)
    .innerJoin(users, eq(users.id, newsPosts.authorId))
    .where(eq(newsPosts.id, postId))
    .limit(1);
  if (!row) notFound();
  const { post, author } = row;
  const mine = canPublish(user) && (user.perms.admin || post.authorId === user.id);

  return (
    <article className="space-y-4">
      <Link href="/actus" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Actualités</Link>
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted">{SCOPE_LABEL[post.scope]}</div>
        <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
        <p className="text-xs text-muted">
          {dateFmt.format(post.createdAt)} · {author}
          {post.updatedAt.getTime() - post.createdAt.getTime() > 60_000 && ` · modifié le ${dateFmt.format(post.updatedAt)}`}
        </p>
        {mine && (
          <div className="flex gap-2 pt-1">
            <Link href={`/actus/${post.id}/modifier`} className="btn-ghost"><Pencil size={14} /> Modifier</Link>
            <form action={deleteNews}>
              <input type="hidden" name="postId" value={post.id} />
              <ConfirmButton message="Supprimer cet article ?" className="btn-ghost text-danger">Supprimer</ConfirmButton>
            </form>
          </div>
        )}
      </header>
      <div className="card"><Markdown>{post.body}</Markdown></div>
    </article>
  );
}
