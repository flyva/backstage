import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { COURSES } from "@/lib/course-data";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Cours" };

export default async function CoursIndexPage() {
  await requireUser();
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm"><Link href="/" className="inline-flex items-center gap-1 text-muted hover:text-fg"><ArrowLeft size={14} /> Accueil</Link></p>
      <h1 className="text-2xl font-bold">Cours</h1>
      <p className="text-sm text-muted">Les matières du programme, avec un quiz à la fin de chacune.</p>
      <ul className="space-y-2">
        {COURSES.map((c) => (
          <li key={c.key}>
            <Link href={`/cours/lecon/${c.pages[0]?.slug ?? ""}`} className="card flex items-center gap-3 p-4 hover:border-accent">
              <GraduationCap size={20} className="shrink-0 text-accent" />
              <div className="min-w-0">
                <div className="font-medium">{c.label}</div>
                <div className="truncate text-sm text-muted">{c.description}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
