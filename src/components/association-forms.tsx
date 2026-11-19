"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { saveAssociationDoc, saveAssociationInfo } from "@/lib/association-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400">{state.ok}</p>;
  return null;
}

export type AssociationInfoValues = { rna?: string; titre?: string; adresseSiege?: string; adresseGestion?: string; siren?: string; siret?: string };

/** Fiche officielle de l'association : RNA, titre, adresses, SIREN/SIRET. */
export function AssociationInfoForm(values: AssociationInfoValues) {
  const [state, action, pending] = useActionState(saveAssociationInfo, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="ai-titre">Titre de l&apos;association</label><input id="ai-titre" name="titre" defaultValue={values.titre} maxLength={150} className="input" /></div>
        <div><label className="label" htmlFor="ai-rna">Numéro RNA</label><input id="ai-rna" name="rna" defaultValue={values.rna} maxLength={20} placeholder="W123456789" className="input" /></div>
      </div>
      <div>
        <label className="label" htmlFor="ai-siege">Adresse du siège</label>
        <textarea id="ai-siege" name="adresseSiege" defaultValue={values.adresseSiege} rows={2} maxLength={300} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="ai-gestion">Adresse de gestion (si différente, facultatif)</label>
        <textarea id="ai-gestion" name="adresseGestion" defaultValue={values.adresseGestion} rows={2} maxLength={300} className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ai-siren">SIREN (9 chiffres)</label>
          <input id="ai-siren" name="siren" defaultValue={values.siren} maxLength={9} inputMode="numeric" className="input" />
          <p className="mt-1 text-xs text-muted">Identifie l&apos;association elle-même (comme un numéro de carte d&apos;identité).</p>
        </div>
        <div>
          <label className="label" htmlFor="ai-siret">SIRET (14 chiffres)</label>
          <input id="ai-siret" name="siret" defaultValue={values.siret} maxLength={14} inputMode="numeric" className="input" />
          <p className="mt-1 text-xs text-muted">Identifie un établissement précis (SIREN + 5 chiffres de localisation) : utile s&apos;il y en a plusieurs.</p>
        </div>
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

/** Dépôt (ou remplacement) d'un document officiel PDF (Récépissé RNA, Lettre d'intention…). */
export function AssociationDocForm({ which, label, currentFile }: { which: "recu_rna" | "lettre_intention"; label: string; currentFile?: string }) {
  const [state, action, pending] = useActionState(saveAssociationDoc, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="which" value={which} />
      <label className="label" htmlFor={`doc-${which}`}>{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        {currentFile && <a href={`/files/${currentFile}`} target="_blank" className="btn-ghost text-xs">Voir le document actuel</a>}
        <input id={`doc-${which}`} name="file" type="file" accept="application/pdf" className="input flex-1" />
        <button className="btn-ghost text-xs" disabled={pending}>{pending ? "Envoi…" : "Déposer"}</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
