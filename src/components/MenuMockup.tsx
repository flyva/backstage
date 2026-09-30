"use client";

import { useState } from "react";
import { Bell, BookOpen, CircleHelp, KeyRound, Link2, ListChecks, Palette, Settings, ShieldCheck, User, UserRound, Users } from "lucide-react";

type Section = { id: string; label: string; icon: typeof Settings; lines: string[] };

const SPACES: Record<string, { title: string; sections: Section[] }> = {
  admin: {
    title: "Administration",
    sections: [
      { id: "g", label: "Général", icon: Settings, lines: ["Paramètres de l'école", "Wi-Fi, adresse, liens", "Comptes en attente : 0"] },
      { id: "u", label: "Utilisateurs", icon: Users, lines: ["Mem Bre : Membre : Actif", "Marie Dupont : Tuteur : Actif", "Quentin Rault : Administrateur : Actif"] },
      { id: "r", label: "Rôles", icon: ShieldCheck, lines: ["Administrateur : tous les droits", "BDE : BDE Gérer, Actus Gérer", "Membre : lecture seule"] },
      { id: "c", label: "Checklists", icon: ListChecks, lines: ["Montage : 8 éléments", "Balances : 5 éléments", "Sécurité : 5 éléments"] },
      { id: "f", label: "FAQ", icon: CircleHelp, lines: ["Comment réserver du matériel ?", "Où trouver mon planning ?"] },
      { id: "l", label: "Liens utiles", icon: Link2, lines: ["Webmail 3IS", "Ypareo", "Studea"] },
      { id: "w", label: "Wiki", icon: BookOpen, lines: ["Catégories : 4", "Renommer / fusionner"] },
    ],
  },
  profil: {
    title: "Profil",
    sections: [
      { id: "i", label: "Informations", icon: User, lines: ["Prénom, nom", "Adresse du domicile", "Entreprise (alternance)", "Lien iCalendar Ypareo"] },
      { id: "s", label: "Sécurité", icon: KeyRound, lines: ["Changer le mot de passe", "Appareils connectés"] },
      { id: "n", label: "Notifications", icon: Bell, lines: ["Actualités", "Évènements BDE", "Rappels de tâches"] },
      { id: "a", label: "Apparence", icon: Palette, lines: ["Thème clair / sombre", "Couleur d'accent", "Couleur du menu"] },
    ],
  },
};

// Maquette : compare le menu horizontal (onglets) et le menu vertical (à gauche) pour l'Administration et le Profil.
export function MenuMockup() {
  const [space, setSpace] = useState<"admin" | "profil">("admin");
  const [layout, setLayout] = useState<"h" | "v">("v");
  const [active, setActive] = useState<Record<string, string>>({ admin: "g", profil: "i" });
  const data = SPACES[space];
  const cur = data.sections.find((s) => s.id === active[space]) ?? data.sections[0];

  const seg = (on: boolean) => `rounded-full px-4 py-1.5 text-sm ${on ? "bg-accent text-accent-fg" : "border border-line text-muted hover:text-fg"}`;

  const content = (
    <div className="card min-w-0 flex-1 space-y-3">
      <h3 className="flex items-center gap-2 font-semibold"><cur.icon size={18} className="text-accent" /> {cur.label}</h3>
      <ul className="space-y-2">
        {cur.lines.map((l) => <li key={l} className="rounded-lg border border-line bg-bg px-3 py-2 text-sm">{l}</li>)}
      </ul>
      <div className="h-9 w-32 rounded-lg bg-accent/20" aria-hidden />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex gap-2" role="group" aria-label="Page">
          <button className={seg(space === "admin")} onClick={() => setSpace("admin")}>Administration</button>
          <button className={seg(space === "profil")} onClick={() => setSpace("profil")}>Profil</button>
        </div>
        <div className="flex gap-2" role="group" aria-label="Menu">
          <button className={seg(layout === "h")} onClick={() => setLayout("h")}>Menu horizontal</button>
          <button className={seg(layout === "v")} onClick={() => setLayout("v")}>Menu vertical</button>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-line p-5">
        <h2 className="mb-4 text-2xl font-bold">{data.title}</h2>
        {layout === "h" ? (
          <div className="space-y-5">
            <nav className="flex flex-wrap gap-x-1 border-b border-line" aria-label="Sections">
              {data.sections.map((s) => (
                <button key={s.id} onClick={() => setActive({ ...active, [space]: s.id })} className={`-mb-px border-b-2 px-3 py-2 text-sm ${s.id === cur.id ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-fg"}`}>{s.label}</button>
              ))}
            </nav>
            {content}
          </div>
        ) : (
          <div className="flex flex-col gap-5 md:flex-row">
            <nav className="shrink-0 md:w-56" aria-label="Sections">
              <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
                {data.sections.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setActive({ ...active, [space]: s.id })} className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm ${s.id === cur.id ? "bg-accent text-accent-fg" : "text-muted hover:bg-bg hover:text-fg"}`}>
                      <s.icon size={16} /> {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            {content}
          </div>
        )}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted"><UserRound size={14} /> Maquette : rien n&apos;est enregistré. Réduis la fenêtre pour voir le comportement sur téléphone (le menu vertical devient une rangée défilante).</p>
    </div>
  );
}
