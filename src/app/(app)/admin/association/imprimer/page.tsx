import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Fiche association" };

// Document officiel de l'association : uniquement les informations légales (celles marquées d'une étoile dans la
// demande d'origine), sans aucune mention de Backstage — à faire passer pour un document de l'association, pas de l'appli.
export default async function AssociationPrintPage() {
  await requireAdmin();
  const s = await getSettings();
  const [president] = await db.select({ name: users.name })
    .from(users).where(and(eq(users.bdeStatus, "bureau"), eq(users.bdeTitle, "Président"))).limit(1);

  return (
    <div className="mx-auto max-w-2xl space-y-6 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/association" className="text-sm text-muted hover:text-fg">← Association</Link>
        <PrintButton />
      </div>

      <header className="space-y-1 border-b-2 border-line pb-4 text-center">
        <h1 className="text-2xl font-bold">{s.asso_titre || "Association"}</h1>
        <p className="text-sm text-muted">Fiche d&apos;identification</p>
      </header>

      <dl className="space-y-4 text-sm">
        <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-line pb-2"><dt className="font-medium text-muted">Titre</dt><dd>{s.asso_titre || "—"}</dd></div>
        <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-line pb-2"><dt className="font-medium text-muted">Numéro RNA</dt><dd>{s.asso_rna || "—"}</dd></div>
        <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-line pb-2"><dt className="font-medium text-muted">Adresse du siège</dt><dd className="whitespace-pre-line">{s.asso_adresse_siege || "—"}</dd></div>
        <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-line pb-2">
          <dt className="font-medium text-muted">SIREN</dt>
          <dd>{s.asso_siren || "—"}<span className="block text-xs text-muted">Identifie l&apos;association elle-même.</span></dd>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-line pb-2">
          <dt className="font-medium text-muted">SIRET</dt>
          <dd>{s.asso_siret || "—"}<span className="block text-xs text-muted">Identifie un établissement précis (SIREN + 5 chiffres de localisation).</span></dd>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2 pb-2"><dt className="font-medium text-muted">Dirigeant</dt><dd>{president?.name ?? "—"}</dd></div>
      </dl>
    </div>
  );
}
