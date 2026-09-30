import { Download, FileText } from "lucide-react";

const FILES = [
  { type: "conduite", label: "Conduite" },
  { type: "lights", label: "Fiche lumière" },
  { type: "inputs", label: "Fiche son" },
  { type: "equipe", label: "Équipe" },
  { type: "checklists", label: "Checklists" },
];

// Téléchargements du projet : chaque partie en CSV (Excel), et le dossier complet en un seul fichier.
export function ProjectDownloads({ projectId }: { projectId: number }) {
  const base = `/projets/${projectId}/fiches/export`;
  return (
    <section className="card space-y-3 print:hidden" aria-label="Téléchargements">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Télécharger</h2>
        <a href={`${base}/complet`} className="btn text-sm"><FileText size={16} /> Dossier complet</a>
      </div>
      <p className="text-xs text-muted">
        Le dossier complet réunit équipe, conduite, checklists, fiches lumière et son, et tâches dans un seul fichier : ouvre-le puis « Imprimer / Enregistrer en PDF ».
      </p>
      <div className="flex flex-wrap gap-2">
        {FILES.map((f) => (
          <a key={f.type} href={`${base}/${f.type}`} className="btn-ghost text-xs"><Download size={14} /> {f.label} (CSV)</a>
        ))}
      </div>
    </section>
  );
}
