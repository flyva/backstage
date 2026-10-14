import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { quizQuestions } from "@/db/schema";
import { COURSES } from "@/lib/course-data";
import { deleteQuestion } from "@/lib/quiz-actions";
import { QuestionForm } from "@/components/quiz-forms";
import { ProjectTabs } from "@/components/ProjectTabs";

export async function generateMetadata({ params }: PageProps<"/admin/quiz/[key]">) {
  const { key } = await params;
  const course = COURSES.find((c) => c.key === key);
  return { title: course ? `Quiz ${course.label}` : "Quiz" };
}

export default async function AdminQuizCoursePage({ params }: PageProps<"/admin/quiz/[key]">) {
  const { key } = await params;
  const course = COURSES.find((c) => c.key === key);
  if (!course) notFound();
  const rows = await db.select().from(quizQuestions).where(eq(quizQuestions.courseKey, key)).orderBy(asc(quizQuestions.id));

  return (
    <div className="max-w-2xl space-y-5">
      <ProjectTabs base="/admin/quiz" tabs={COURSES.map((c) => ({ slug: c.key, label: c.label }))} label="Cours" />
      <p className="text-sm">
        <Link href={`/quiz/${key}`} className="text-accent underline">Voir le quiz public →</Link>
      </p>

      <section className="card space-y-3">
        <h2 className="font-semibold">Ajouter une question</h2>
        <QuestionForm courseKey={key} />
      </section>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Aucune question pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((q) => (
            <details key={q.id} className="card p-0">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                <span className="min-w-0 flex-1 truncate font-medium">{q.question}</span>
              </summary>
              <div className="space-y-4 border-t border-line p-4">
                <QuestionForm courseKey={key} id={q.id} question={q.question} choiceA={q.choiceA} choiceB={q.choiceB} choiceC={q.choiceC} choiceD={q.choiceD} answer={q.answer} />
                <form action={deleteQuestion} className="border-t border-line pt-3">
                  <input type="hidden" name="id" value={q.id} />
                  <button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button>
                </form>
              </div>
            </details>
          ))}
        </ul>
      )}
    </div>
  );
}
