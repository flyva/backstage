import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { CourseCreateForm } from "@/components/CourseCreateForm";

export const metadata = { title: "Ajouter un cours" };

export default async function NewCoursePage() {
  await requireUser();
  return (
    <div className="max-w-2xl space-y-5">
      <header className="space-y-1">
        <p className="text-sm"><Link href="/cours" className="text-muted underline">← Mes cours</Link></p>
        <h1 className="text-2xl font-bold">Ajouter un cours</h1>
        <p className="text-sm text-muted">Pour un cours qui n&apos;est pas dans le planning de l&apos;école (cours supplémentaire, rattrapage, conférence…). Il apparaît dans ton agenda et tes fiches, et la synchronisation ne le touche jamais.</p>
      </header>
      <CourseCreateForm today={todayParis()} />
    </div>
  );
}
