import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { FileText, Printer } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AssociationDocForm, AssociationInfoForm } from "@/components/association-forms";

export const metadata = { title: "Association" };

// Fiche officielle de l'association (RNA, SIREN/SIRET, adresses…) et ses documents (récépissé RNA, lettre
// d'intention) : visible en lecture par tous depuis l'organigramme, modifiable ici uniquement par un admin.
export default async function AssociationSettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  const [president] = await db.select({ name: users.name })
    .from(users).where(and(eq(users.bdeStatus, "bureau"), eq(users.bdeTitle, "Président"))).limit(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Fiche association</h2>
        <Link href="/admin/association/imprimer" target="_blank" className="btn-ghost"><Printer size={16} /> Document officiel (PDF)</Link>
      </div>

      <section className="card space-y-3">
        <h3 className="font-semibold">Informations</h3>
        <AssociationInfoForm
          rna={s.asso_rna} titre={s.asso_titre} adresseSiege={s.asso_adresse_siege}
          adresseGestion={s.asso_adresse_gestion} siren={s.asso_siren} siret={s.asso_siret}
        />
        <p className="text-sm text-muted">
          Dirigeant : <strong>{president?.name ?? "Non défini"}</strong>
          {!president && <span> — renseigne le Président dans l&apos;<Link href="/admin/utilisateurs" className="underline">onglet Statut BDE</Link> de sa fiche.</span>}
        </p>
      </section>

      <section className="card space-y-4">
        <h3 className="flex items-center gap-2 font-semibold"><FileText size={16} /> Documents officiels</h3>
        <AssociationDocForm which="recu_rna" label="Récépissé RNA" currentFile={s.asso_doc_recu_rna} />
        <AssociationDocForm which="lettre_intention" label="Lettre d'intention" currentFile={s.asso_doc_lettre_intention} />
      </section>
    </div>
  );
}
