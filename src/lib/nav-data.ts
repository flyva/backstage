import {
  BookOpen, BookUser, Bot, Briefcase, Building2, Calculator, Car, CalendarDays, Camera, CircleHelp, ClipboardList, Clock, Cog, Gamepad2, Globe, Home, Images, Laptop, Lightbulb, Link2, Network, Newspaper, PartyPopper, Receipt, School, NotebookPen, ShieldCheck, SquareKanban, TramFront, Users, Contact, Megaphone, CalendarClock, Wrench, Zap, BarChart3,
  type LucideIcon,
} from "lucide-react";

export type Badge = "loans";
export type Item = { href?: string; label: string; icon: LucideIcon; badge?: Badge; adminOnly?: boolean; module?: string; children?: Item[]; variant?: "button" };
export type Group = { id: string; title: string; items: Item[] };

// Six groupes par thème, dépliés UN SEUL à la fois (accordéon) dans Nav.tsx. Source unique : réutilisée par l'admin
// (Rôles > Pages du menu) pour proposer exactement les mêmes pages, avec les mêmes intitulés.
export const GROUPS: Group[] = [
  {
    id: "quotidien", title: "Au quotidien",
    items: [
      { href: "/", label: "Accueil", icon: Home },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/mobilite", label: "Mobilité", icon: TramFront },
    ],
  },
  {
    id: "alternance", title: "Alternance",
    items: [
      { href: "/alternance", label: "Planning", icon: CalendarDays },
      { href: "/alternance/carnet", label: "Journal de bord", icon: NotebookPen },
      { href: "/alternance/pointeuse", label: "Pointeuse", icon: Clock },
      { href: "/alternance/stats", label: "Statistiques", icon: BarChart3 },
      { href: "/alternance/notes-de-frais", label: "Notes de frais", icon: Receipt },
    ],
  },
  {
    id: "travail", title: "Travail",
    items: [
      { href: "/projets", label: "Projets", icon: Briefcase },
      { href: "/kanban", label: "Mon kanban", icon: SquareKanban },
      { href: "/reseau", label: "Carnet de réseau", icon: Contact },
      {
        label: "Recherche entreprises", icon: Building2, module: "rechercheEntreprises",
        children: [
          { href: "/recherche-entreprises", label: "Mon tableau", icon: ClipboardList },
          { href: "/recherche-entreprises/annuaire", label: "Annuaire", icon: Building2, variant: "button" },
          { href: "/recherche-entreprises/outils", label: "Outils & IA", icon: Wrench },
          { href: "/recherche-entreprises/sites-ressources", label: "Sites ressources", icon: Globe },
          { href: "/recherche-entreprises/jobboards", label: "Jobboards", icon: Laptop },
          { href: "/recherche-entreprises/sites-carrieres", label: "Sites carrières", icon: Megaphone },
          { href: "/faq", label: "FAQ", icon: CircleHelp, variant: "button" },
        ],
      },
      { href: "/calculettes", label: "Calculettes", icon: Calculator },
      {
        label: "Cours", icon: NotebookPen,
        children: [
          { href: "/cours", label: "Mes cours", icon: NotebookPen, module: "cours" },
          { href: "/habilitation", label: "Habilitation électrique", icon: ShieldCheck, module: "habilitation" },
          { href: "/cours/lecon/reseaux", label: "Réseaux", icon: Network, module: "reseaux" },
          { href: "/cours/lecon/mecanique", label: "Mécanique", icon: Cog, module: "mecanique" },
          { href: "/cours/lecon/electricite", label: "Électricité", icon: Zap, module: "electricite" },
          { href: "/cours/lecon/lumiere", label: "Lumière", icon: Lightbulb, module: "lumiere" },
        ],
      },
    ],
  },
  {
    id: "savoirs", title: "Savoirs",
    items: [
      { href: "/wiki", label: "Wiki", icon: BookOpen },
      { href: "/assistant", label: "Assistant", icon: Bot },
      { href: "/faq", label: "FAQ", icon: CircleHelp },
    ],
  },
  {
    id: "promo", title: "Promo",
    items: [
      { href: "/actus", label: "Actualités", icon: Newspaper, module: "actus" },
      { href: "/annuaire", label: "Annuaire", icon: Users },
      { href: "/annonces", label: "Annonces", icon: Megaphone },
      { href: "/disponibilites", label: "Disponibilités", icon: CalendarClock },
      { href: "/covoiturage", label: "Covoiturage", icon: Car },
    ],
  },
  {
    id: "vie", title: "Vie étudiante",
    items: [
      { href: "/bde", label: "BDE", icon: PartyPopper, module: "bde" },
      { href: "/galerie", label: "Galerie", icon: Images, module: "galerie" },
      { href: "/instagram", label: "Instagram", icon: Camera },
    ],
  },
  {
    id: "detente", title: "Détente",
    items: [
      { href: "/detente", label: "Tetris", icon: Gamepad2 },
    ],
  },
  {
    id: "ecole", title: "École",
    items: [
      { href: "/ecole", label: "Wi-Fi et plan", icon: School },
      { href: "/contacts", label: "Contacts", icon: BookUser },
      { href: "/liens", label: "Liens utiles", icon: Link2 },
    ],
  },
];

/**
 * Pages individuelles qu'un rôle peut masquer une par une (droit « hiddenPages »), groupées comme dans le menu.
 * N'inclut pas les pages déjà couvertes par un autre mécanisme (Matériel/BDE/Actualités/Galerie ont un niveau
 * Voir/Gérer ; les pages de Cours ont leur propre liste) : éviter deux réglages contradictoires pour la même page.
 */
export const TOGGLEABLE_GROUPS = GROUPS.map((g) => ({
  id: g.id,
  title: g.title,
  pages: g.items.filter((i): i is Item & { href: string } => !!i.href && !i.module),
})).filter((g) => g.pages.length > 0);
