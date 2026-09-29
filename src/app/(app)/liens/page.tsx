import { asc } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { db } from "@/db";
import { usefulLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Liens utiles" };

export default async function LiensPage() {
  await requireUser();
  const links = await db.select().from(usefulLinks).orderBy(asc(usefulLinks.category), asc(usefulLinks.position), asc(usefulLinks.id));
  const groups = Map.groupBy(links, (l) => l.category);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Liens utiles</h1>
      {links.length === 0 && <p className="text-sm text-muted">Aucun lien pour le moment.</p>}
      {[...groups].map(([category, list]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{category}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((l) => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="card flex items-start gap-3 hover:border-accent">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{l.label}</div>
                  {l.description && <div className="text-sm text-muted">{l.description}</div>}
                </div>
                <ExternalLink size={14} className="mt-1 shrink-0 text-muted" />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
