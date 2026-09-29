import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { requirePublisher } from "@/lib/news";
import { NewsForm } from "@/components/NewsForm";

export const metadata = { title: "Modifier l'article" };

export default async function EditNewsPage({ params }: PageProps<"/actus/[id]/modifier">) {
  const user = await requirePublisher();
  const { id } = await params;
  const [post] = await db.select().from(newsPosts).where(eq(newsPosts.id, Number(id))).limit(1);
  if (!post) notFound();
  if (user.role !== "admin" && post.authorId !== user.id) redirect(`/actus/${post.id}`);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href={`/actus/${post.id}`} className="text-sm text-muted hover:text-fg">← {post.title}</Link>
      <h1 className="text-2xl font-bold">Modifier l&apos;article</h1>
      <NewsForm postId={post.id} title={post.title} body={post.body} scope={post.scope} pinned={post.pinned} isAdmin={user.role === "admin"} />
    </div>
  );
}
