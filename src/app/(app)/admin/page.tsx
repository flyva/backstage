import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import {
  BarChart3, Building2, BookOpen, ClipboardCheck, CircleHelp, DatabaseBackup, FileLock2, FileSpreadsheet, GraduationCap,
  History, HeartPulse, Landmark, Link2, ListChecks, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Users, Wallet, ChevronRight, type LucideIcon,
} from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { approveUser, rejectUser } from "@/lib/actions";

export const metadata = { title: "Administration" };

type CardDef = { href: string; label: string; hint: string; icon: LucideIcon };
type Group = { title: string; cards: CardDef[] };

const GROUPS: Group[] = [
  {
    title: "Comptes",
    cards: [
      { href: "/admin/utilisateurs", label: "Utilisateurs", hint: "Comptes, rôles, validations", icon: Users },
      { href: "/admin/roles", label: "Rôles", hint: "Droits par rôle", icon: ShieldCheck },
      { href: "/admin/filieres", label: "Filières", hint: "Filières et classes de promo", icon: GraduationCap },
      { href: "/admin/statistiques", label: "Statistiques", hint: "Usage de l'appli", icon: BarChart3 },
    ],
  },
  {
    title: "Contenu",
    cards: [
      { href: "/admin/faq", label: "FAQ", hint: "Questions fréquentes", icon: CircleHelp },
      { href: "/admin/liens", label: "Liens utiles", hint: "Annuaire de liens", icon: Link2 },
      { href: "/admin/nouveautes", label: "Nouveautés", hint: "Historique des évolutions", icon: Sparkles },
      { href: "/admin/wiki", label: "Wiki", hint: "Pages et fichiers du wiki", icon: BookOpen },
      { href: "/admin/checklists", label: "Checklists", hint: "Modèles de checklists projet", icon: ListChecks },
      { href: "/admin/quiz", label: "Quiz", hint: "Questions des quiz", icon: ClipboardCheck },
    ],
  },
  {
    title: "Entreprises",
    cards: [
      { href: "/admin/statuts-entreprises", label: "Statuts entreprises", hint: "Suivi des candidatures", icon: Building2 },
    ],
  },
  {
    title: "BDE",
    cards: [
      { href: "/admin/finances", label: "Comptabilité", hint: "Recettes, dépenses, rapport annuel", icon: Wallet },
      { href: "/admin/finances/normal", label: "Comptabilité normale", hint: "Pour les impôts / le DAF de l'école", icon: FileSpreadsheet },
      { href: "/admin/comptabilite-parametres", label: "Paramètres comptabilité", hint: "Comptes bancaires, plan comptable, exercices", icon: SlidersHorizontal },
      { href: "/admin/association", label: "Association", hint: "RNA, SIREN/SIRET, documents officiels", icon: Landmark },
    ],
  },
  {
    title: "Système",
    cards: [
      { href: "/admin/general", label: "Général", hint: "Guide de rentrée, icône, paramètres école", icon: Settings2 },
      { href: "/admin/sauvegardes", label: "Sauvegardes", hint: "Exports et restaurations", icon: DatabaseBackup },
      { href: "/admin/rgpd", label: "RGPD", hint: "Textes légaux, export des données", icon: FileLock2 },
      { href: "/admin/audit", label: "Journal d'audit", hint: "Qui a fait quoi, côté admin", icon: History },
      { href: "/admin/sante", label: "Santé", hint: "État du serveur et des services", icon: HeartPulse },
    ],
  },
];

export default async function AdminPage() {
  await requireAdmin();
  const pending = await db.select().from(users).where(eq(users.status, "pending")).orderBy(asc(users.createdAt));

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section className="card space-y-3 border-accent">
          <h2 className="font-semibold">En attente de validation ({pending.length})</h2>
          <p className="text-sm text-muted">
            Comptes Google personnels (adresse hors école) : ils n&apos;ont accès à rien tant que tu ne les as pas validés.
          </p>
          <ul className="divide-y divide-line text-sm">
            {pending.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted">{u.email}</div>
                  {u.requestNote && <p className="mt-1 whitespace-pre-line rounded-lg border border-line bg-bg p-2 text-xs">{u.requestNote}</p>}
                </div>
                <form action={approveUser}><input type="hidden" name="id" value={u.id} /><button className="btn">Valider</button></form>
                <form action={rejectUser} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="reason" maxLength={500} placeholder="Motif du refus (facultatif, visible par la personne)" className="input w-64 max-w-full text-xs" aria-label={`Motif du refus pour ${u.name}`} />
                  <button className="btn-ghost">Refuser</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {GROUPS.map((g) => (
        <section key={g.title} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{g.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.cards.map((c) => (
              <Link key={c.href} href={c.href} className="card anim-rise-in flex items-center gap-3 hover:-translate-y-0.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><c.icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.label}</span>
                  <span className="block truncate text-xs text-muted">{c.hint}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
