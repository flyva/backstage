import Link from "next/link";
import { FileText, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getDirigeants } from "@/lib/association-data";
import { AssociationDocForm, AssociationInfoForm } from "@/components/association-forms";

export const metadata = { title: "Association" };

// Fiche officielle de l'association (RNA, SIREN/SIRET, adresses…) et ses documents (récépissé RNA, lettre
// d'intention) : visible en lecture par tous depuis l'organigramme, modifiable ici uniquement par un admin.
export default async function AssociationSettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  const dirigeants = await getDirigeants();

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
          Dirigeants (toute personne au bureau) :{" "}
          {dirigeants.length === 0 ? (
            <>Non défini — renseigne le statut « Bureau » dans l&apos;<Link href="/admin/utilisateurs" className="underline">onglet Statut BDE</Link> de la fiche de chacun.</>
          ) : (
            <strong>{dirigeants.map((d) => `${d.name}${d.bdeTitle ? ` (${d.bdeTitle})` : ""}`).join(", ")}</strong>
          )}
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
