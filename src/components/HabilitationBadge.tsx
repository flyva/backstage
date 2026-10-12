import { ShieldCheck } from "lucide-react";

/** Pastille du symbole d'habilitation électrique d'une personne (B0, BS, B1V…), si elle l'a renseigné sur son profil. */
export function HabilitationBadge({ value, className = "" }: { value: string | null; className?: string }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent ${className}`} title={`Habilitation électrique : ${value}`}>
      <ShieldCheck size={11} aria-hidden /> {value}
    </span>
  );
}
