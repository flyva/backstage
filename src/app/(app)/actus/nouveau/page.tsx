import Link from "next/link";
import { requirePublisher } from "@/lib/news";
import { NewsForm } from "@/components/NewsForm";

export const metadata = { title: "Nouvel article" };

export default async function NewNewsPage() {
  const user = await requirePublisher();
  return (
    <div className="space-y-4">
      <Link href="/actus" className="text-sm text-muted hover:text-fg">← Actualités</Link>
      <h1 className="text-2xl font-bold">Nouvel article</h1>
      <NewsForm isAdmin={user.perms.admin} scope={!user.perms.admin && user.perms.bde && !user.perms.actus ? "bde" : "ecole"} />
    </div>
  );
}
