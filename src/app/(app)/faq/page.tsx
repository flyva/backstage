import { asc } from "drizzle-orm";
import { db } from "@/db";
import { faqItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  await requireUser();
  const items = await db.select().from(faqItems).orderBy(asc(faqItems.category), asc(faqItems.position), asc(faqItems.id));
  const groups = Map.groupBy(items, (i) => i.category);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">FAQ</h1>
      {items.length === 0 && <p className="text-sm text-muted">Aucune question pour le moment.</p>}
      {[...groups].map(([category, list]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{category}</h2>
          {list.map((i) => (
            <details key={i.id} className="card group p-0">
              <summary className="cursor-pointer list-none px-5 py-3 font-medium marker:hidden">{i.question}</summary>
              <p className="whitespace-pre-line border-t border-line px-5 py-3 text-sm text-muted">{i.answer}</p>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
