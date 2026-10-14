import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { quizQuestions } from "@/db/schema";
import { COURSES } from "@/lib/course-data";

export const metadata = { title: "Quiz" };

export default async function AdminQuizPage() {
  const counts = new Map((await db.select({ courseKey: quizQuestions.courseKey, n: sql<number>`count(*)` }).from(quizQuestions).groupBy(quizQuestions.courseKey)).map((r) => [r.courseKey, Number(r.n)]));

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted">Une banque de questions par cours : choisis-en un pour ajouter, modifier ou supprimer ses questions. Le quiz public en tire 10 au hasard à chaque tentative.</p>
      <ul className="space-y-2">
        {COURSES.map((c) => (
          <li key={c.key}>
            <Link href={`/admin/quiz/${c.key}`} className="card flex items-center justify-between gap-3 hover:border-accent">
              <span className="font-medium">{c.label}</span>
              <span className="text-sm text-muted">{counts.get(c.key) ?? 0} question{(counts.get(c.key) ?? 0) > 1 ? "s" : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
