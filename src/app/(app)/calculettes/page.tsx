import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Calculettes } from "@/components/Calculettes";

export const metadata = { title: "Calculettes" };

export default async function CalculettesPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Calculettes de régie</h1>
        <p className="text-sm text-muted">
          Câbles, patch DMX et son. Pour la charge de tout un projet (circuits, phases), utilise l&apos;onglet <strong>Charge</strong> du projet : <Link href="/projets" className="text-accent underline">mes projets</Link>.
        </p>
      </header>
      <Calculettes />
    </div>
  );
}
