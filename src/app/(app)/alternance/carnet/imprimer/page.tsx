import Link from "next/link";
import { and, asc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { workLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { dayLabel, isMonth, monthLabel } from "@/lib/alternance";
import { Markdown } from "@/components/Markdown";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Bilan du mois" };

// Bilan du mois prêt à imprimer ou à enregistrer en PDF (à remettre au tuteur ou à l'école).
export default async function LogbookPrintPage({ searchParams }: PageProps<"/alternance/carnet/imprimer">) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = isMonth(sp.m) ? sp.m : todayParis().slice(0, 7);
  const logs = await db.select().from(workLogs).where(and(eq(workLogs.userId, user.id), like(workLogs.day, `${month}-%`))).orderBy(asc(workLogs.day), asc(workLogs.id));
  const skills = [...new Set(logs.flatMap((l) => l.skills?.split(",") ?? []))];
  const period = (l: { day: string; endDay: string }) => (l.day === l.endDay ? dayLabel(l.day) : `${dayLabel(l.day)} → ${dayLabel(l.endDay)}`);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/alternance/carnet?m=${month}`} className="text-sm text-muted hover:text-fg">← Journal de bord</Link>
        <PrintButton />
      </div>
      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold capitalize">Bilan de {monthLabel(month)}</h1>
        <p className="text-sm text-muted">{user.name} · {logs.length} entrée(s)</p>
        {skills.length > 0 && <p className="mt-1 text-sm">Compétences : {skills.join(", ")}</p>}
      </header>
      {logs.length === 0 && <p className="text-sm text-muted">Aucune entrée ce mois-ci.</p>}
      {logs.map((l) => (
        <article key={l.id} className="break-inside-avoid space-y-1 border-b border-line pb-3">
          <h2 className="font-semibold capitalize">{period(l)} <span className="font-normal text-muted">· {l.place === "ecole" ? "École" : "Entreprise"}</span></h2>
          <Markdown breaks>{l.mission}</Markdown>
          {l.skills && <p className="text-xs text-muted">Compétences : {l.skills.replaceAll(",", ", ")}</p>}
        </article>
      ))}
    </div>
  );
}
