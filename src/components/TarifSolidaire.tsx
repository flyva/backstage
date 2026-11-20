"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Tarification solidaire TBM — contenu repris tel quel (prix, conditions, lien) de la page équivalente de BDE.
export function TarifSolidaire() {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 bg-bg px-3.5 py-3 text-left">
        <span className="shrink-0 text-base">🤝</span>
        <div className="flex-1">
          <div className="text-[12.5px] font-bold">Tarification solidaire</div>
          <div className="text-[11.5px] text-muted">Réduction selon le quotient familial — vérifie ton éligibilité</div>
        </div>
        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line bg-surface px-4 py-3.5">
          <p className="text-[12.5px] leading-relaxed">
            La tarification solidaire permet d&apos;accéder aux transports TBM à tarif réduit en fonction de ton quotient familial (QF) CAF ou MSA.
          </p>
          <div className="rounded-lg border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] px-3 py-2.5 text-xs leading-relaxed text-[#854d0e]">
            <strong>Qui peut en bénéficier ?</strong><br />
            Tout foyer dont le quotient familial CAF ou MSA est <strong>inférieur ou égal à 999 €</strong>.
          </div>
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Comment faire ?</div>
            <div className="space-y-1 text-xs">
              <div>1. Vérifie ton éligibilité sur le simulateur Bordeaux Métropole</div>
              <div>2. Prépare ton avis CAF ou MSA justifiant ton QF</div>
              <div>3. Rends-toi en agence TBM avec les justificatifs</div>
            </div>
          </div>
          <a
            href="https://tarificationsolidaire.bordeaux-metropole.fr/Accueil.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-accent-fg"
          >
            Vérifier mon éligibilité →
          </a>
        </div>
      )}
    </div>
  );
}
