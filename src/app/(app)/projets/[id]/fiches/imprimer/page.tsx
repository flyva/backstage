import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { techInputs, techLights } from "@/db/schema";
import { requireProject } from "@/lib/projects";
import { findConflicts, patchLabel } from "@/lib/tech";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Dossier technique" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long" });

export default async function PrintPage({ params }: PageProps<"/projets/[id]/fiches/imprimer">) {
  const { id } = await params;
  const { project } = await requireProject(Number(id));
  const [lights, inputs] = await Promise.all([
    db.select().from(techLights).where(eq(techLights.projectId, project.id)).orderBy(asc(techLights.channel), asc(techLights.universe), asc(techLights.address)),
    db.select().from(techInputs).where(eq(techInputs.projectId, project.id)).orderBy(asc(techInputs.channel)),
  ]);
  const conflicts = findConflicts(lights);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/projets/${project.id}/fiches`} className="text-sm text-muted hover:text-fg">← Fiches techniques</Link>
        <PrintButton />
      </div>

      <header className="border-b border-line pb-3">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-sm text-muted">
          Dossier technique{project.eventDate && ` · ${dateFmt.format(new Date(project.eventDate))}`} · édité le {dateFmt.format(new Date())}
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Patch lumière ({lights.length})</h2>
        {lights.length === 0 ? (
          <p className="text-sm text-muted">Aucun projecteur.</p>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-fg">
                {["Circ.", "Projecteur", "Mode", "Patch", "Nb ch", "Position", "Gel", "Notes"].map((h) => <th key={h} className="px-1.5 py-1 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lights.map((l) => (
                <tr key={l.id} className="break-inside-avoid border-b border-line">
                  <td className="px-1.5 py-1 font-mono">{l.channel ?? ""}</td>
                  <td className="px-1.5 py-1 font-medium">{l.label}</td>
                  <td className="px-1.5 py-1">{l.mode}</td>
                  <td className="px-1.5 py-1 font-mono">{patchLabel(l.universe, l.address)}</td>
                  <td className="px-1.5 py-1">{l.footprint}</td>
                  <td className="px-1.5 py-1">{l.position}</td>
                  <td className="px-1.5 py-1">{l.color}</td>
                  <td className="px-1.5 py-1">{l.notes}{conflicts.has(l.id) && <strong className="text-danger"> ⚠ conflit d&apos;adresse</strong>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="break-before-page">
        <h2 className="mb-2 text-lg font-semibold">Liste d&apos;entrées son ({inputs.length})</h2>
        {inputs.length === 0 ? (
          <p className="text-sm text-muted">Aucune entrée.</p>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-fg">
                {["Canal", "Source", "Micro / DI", "Pied", "+48 V", "Notes"].map((h) => <th key={h} className="px-1.5 py-1 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {inputs.map((i) => (
                <tr key={i.id} className="break-inside-avoid border-b border-line">
                  <td className="px-1.5 py-1 font-mono">{i.channel}</td>
                  <td className="px-1.5 py-1 font-medium">{i.source}</td>
                  <td className="px-1.5 py-1">{i.mic}</td>
                  <td className="px-1.5 py-1">{i.stand}</td>
                  <td className="px-1.5 py-1">{i.phantom ? "oui" : ""}</td>
                  <td className="px-1.5 py-1">{i.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
