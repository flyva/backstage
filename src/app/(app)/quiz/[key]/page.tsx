import Link from "next/link";
import { notFound } from "next/navigation";
import { COURSES } from "@/lib/course-data";
import { loadQuizBank } from "@/lib/quiz-actions";
import { CourseQuizLoader } from "@/components/CourseQuizLoader";

export async function generateMetadata({ params }: PageProps<"/quiz/[key]">) {
  const { key } = await params;
  const course = COURSES.find((c) => c.key === key);
  return { title: course ? `Quiz ${course.label}` : "Quiz" };
}

export default async function CourseQuizPage({ params }: PageProps<"/quiz/[key]">) {
  const { key } = await params;
  const course = COURSES.find((c) => c.key === key);
  if (!course) notFound();
  const bank = await loadQuizBank(key);

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm"><Link href={`/cours/lecon/${course.pages[0]?.slug ?? ""}`} className="text-muted underline">← {course.label}</Link></p>
      <div>
        <h1 className="text-2xl font-bold">Quiz {course.label}</h1>
        <p className="text-sm text-muted">Teste-toi sur le cours {course.label.toLowerCase()}.</p>
      </div>
      <CourseQuizLoader bank={bank} courseLabel={course.label} />
    </div>
  );
}
