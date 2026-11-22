import {
  BarChart3, Building2, BookOpen, ClipboardCheck, CircleHelp, DatabaseBackup, FileLock2, FileSpreadsheet, GraduationCap,
  History, HeartPulse, Landmark, Link2, ListChecks, MapPin, Package, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  Users, Wallet,
} from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { approveUser, rejectUser } from "@/lib/actions";
import { AdminTiles, type AdminGroup } from "@/components/AdminTiles";

export const metadata = { title: "Administration" };

const GROUPS: AdminGroup[] = [
  {
    key: "comptes",
    title: "Comptes",
    cards: [
      { href: "/admin/utilisateurs", label: "Utilisateurs", hint: "Comptes, rôles, validations", icon: <Users size={17} /> },
      { href: "/admin/roles", label: "Rôles", hint: "Droits par rôle", icon: <ShieldCheck size={17} /> },
      { href: "/admin/filieres", label: "Filières", hint: "Filières et classes de promo", icon: <GraduationCap size={17} /> },
      { href: "/admin/statistiques", label: "Statistiques", hint: "Usage de l'appli", icon: <BarChart3 size={17} /> },
    ],
  },
  {
    key: "contenu",
    title: "Contenu",
    cards: [
      { href: "/admin/faq", label: "FAQ", hint: "Questions fréquentes", icon: <CircleHelp size={17} /> },
      { href: "/admin/liens", label: "Liens utiles", hint: "Annuaire de liens", icon: <Link2 size={17} /> },
      { href: "/admin/nouveautes", label: "Nouveautés", hint: "Historique des évolutions", icon: <Sparkles size={17} /> },
      { href: "/admin/wiki", label: "Wiki", hint: "Pages et fichiers du wiki", icon: <BookOpen size={17} /> },
      { href: "/admin/checklists", label: "Checklists", hint: "Modèles de checklists projet", icon: <ListChecks size={17} /> },
      { href: "/admin/quiz", label: "Quiz", hint: "Questions des quiz", icon: <ClipboardCheck size={17} /> },
    ],
  },
  {
    key: "entreprises",
    title: "Entreprises",
    cards: [
      { href: "/admin/statuts-entreprises", label: "Statuts entreprises", hint: "Suivi des candidatures", icon: <Building2 size={17} /> },
    ],
  },
  {
    key: "bde",
    title: "BDE",
    cards: [
      { href: "/admin/finances", label: "Comptabilité", hint: "Recettes, dépenses, rapport annuel", icon: <Wallet size={17} /> },
      { href: "/admin/finances/normal", label: "Comptabilité normale", hint: "Pour les impôts / le DAF de l'école", icon: <FileSpreadsheet size={17} /> },
      { href: "/admin/comptabilite-parametres", label: "Paramètres comptabilité", hint: "Comptes bancaires, plan comptable, exercices", icon: <SlidersHorizontal size={17} /> },
      { href: "/admin/association", label: "Association", hint: "RNA, SIREN/SIRET, documents officiels", icon: <Landmark size={17} /> },
    ],
  },
  {
    key: "inventaire",
    title: "Inventaire",
    cards: [
      { href: "/inventaire", label: "Stock", hint: "Produits, quantités, DLC", icon: <Package size={17} /> },
      { href: "/inventaire/parametres", label: "Paramètres inventaire", hint: "Entrepôts et adresses de rangement", icon: <MapPin size={17} /> },
    ],
  },
  {
    key: "systeme",
    title: "Système",
    cards: [
      { href: "/admin/general", label: "Général", hint: "Guide de rentrée, icône, paramètres école", icon: <Settings2 size={17} /> },
      { href: "/admin/sauvegardes", label: "Sauvegardes", hint: "Exports et restaurations", icon: <DatabaseBackup size={17} /> },
      { href: "/admin/rgpd", label: "RGPD", hint: "Textes légaux, export des données", icon: <FileLock2 size={17} /> },
      { href: "/admin/audit", label: "Journal d'audit", hint: "Qui a fait quoi, côté admin", icon: <History size={17} /> },
      { href: "/admin/sante", label: "Santé", hint: "État du serveur et des services", icon: <HeartPulse size={17} /> },
    ],
  },
];

export default async function AdminPage() {
  const admin = await requireAdmin();
  const hidden = new Set(admin.perms.hiddenAdminSections);
  const visibleGroups = GROUPS.filter((g) => !g.key || !hidden.has(g.key));
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

      <AdminTiles groups={visibleGroups} />
    </div>
  );
}
