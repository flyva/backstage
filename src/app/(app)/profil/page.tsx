import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { and, asc, eq, ne } from "drizzle-orm";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import { db } from "@/db";
import { agendaViewers, classes, tracks, userLinks, users } from "@/db/schema";
import { ProfileForm } from "@/components/forms";
import { AvatarForm, CardPanel, CompanyProfileForm, DeleteMyAccountForm, FeedPanel, FicheForm, LinksEditor } from "@/components/people-forms";
import { TimeSettingsForm } from "@/components/time-forms";
import { RestoSettingsForm } from "@/components/alternance-forms";
import { avatarUrl } from "@/lib/avatar-files";
import { absoluteUrl } from "@/lib/base-url";

export const metadata = { title: "Profil" };

// Cinq onglets : la page était une longue suite de cartes. L'onglet se choisit par l'adresse (?onglet=…), sans JavaScript.
// « short » : libellé court pour les téléphones, afin que les onglets tiennent sans faire défiler la barre.
const TABS = [
  { id: "general", label: "Général", short: "Général" },
  { id: "fiche", label: "Photo et fiche", short: "Fiche" },
  { id: "reseaux", label: "Réseaux", short: "Réseaux" },
  { id: "alternance", label: "Alternance", short: "Alt." },
  { id: "partage", label: "Carte et calendrier", short: "Carte" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function ProfilPage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser();
  if (user.perms.companyOnly) return <CompanyProfilePage user={user} />;
  const sp = await searchParams;
  const welcome = sp.bienvenue;
  const tab: TabId = TABS.some((t) => t.id === sp.onglet) ? (sp.onglet as TabId) : "general";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      {welcome && (
        <div className="card border-accent text-sm">
          Bienvenue sur Backstage ! Renseigne ton adresse et ton lien Ypareo pour personnaliser ton espace.
        </div>
      )}

      <nav className="flex flex-wrap gap-x-1 border-b border-line" aria-label="Sections du profil">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "general" ? "/profil" : `/profil?onglet=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${t.id === tab ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </Link>
        ))}
      </nav>

      {tab === "general" && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <div className="card">
            <ProfileForm firstName={user.firstName} lastName={user.lastName} homeAddress={user.homeAddress ?? ""} companyName={user.companyName ?? ""} companyAddress={user.companyAddress ?? ""} icalUrl={user.icalUrl ?? ""} />
          </div>
          <div className="space-y-5">
          <p className="text-sm text-muted">
            Thème, couleurs, notifications et mot de passe : <Link href="/parametres" className="text-accent underline">Paramètres</Link>.
          </p>
          <div className="card">
            <h2 className="mb-2 font-semibold">Comment obtenir mon lien iCalendar Ypareo ?</h2>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted">
              <li>Connecte-toi à Ypareo.</li>
              <li>Ouvre <strong className="text-fg">Planning</strong>.</li>
              <li>Clique sur <strong className="text-fg">Action</strong>.</li>
              <li>Choisis <strong className="text-fg">Export au format iCalendar</strong>.</li>
              <li>Copie le lien généré et colle-le dans le champ ci-dessus.</li>
            </ol>
            <p className="mt-3 text-xs text-muted">
              Ce lien donne accès à ton planning : ne le partage pas. Backstage l&apos;utilisera pour ton agenda.
            </p>
          </div>
          <div className="card space-y-2">
            <h2 className="font-semibold">Mes données</h2>
            <p className="text-sm text-muted">Télécharge un fichier avec tes données personnelles : profil, journal de bord, pointeuse, messages envoyés, avis, notes de frais.</p>
            <a href="/api/rgpd/export" className="btn-ghost w-fit"><Download size={15} aria-hidden /> Exporter mes données</a>
            <p className="text-xs text-muted"><Link href="/cgu" className="underline">CGU</Link> · <Link href="/mentions-legales" className="underline">Mentions légales</Link></p>
          </div>
          <div className="card space-y-2 border-danger">
            <h2 className="font-semibold">Supprimer mon compte</h2>
            <p className="text-sm text-muted">Efface définitivement ton compte et tes données. Impossible si tu as créé du contenu partagé (projets, annonces, articles, prêts…) : demande à un administrateur de désactiver ton compte à la place.</p>
            <DeleteMyAccountForm email={user.email} />
          </div>
          </div>
        </div>
      )}

      {tab === "fiche" && <FicheTab user={user} />}
      {tab === "reseaux" && <NetworksTab userId={user.id} />}
      {tab === "alternance" && <AlternanceTab user={user} />}
      {tab === "partage" && <ShareTab user={user} />}
    </div>
  );
}

type User = Awaited<ReturnType<typeof requireUser>>;

/**
 * Profil d'un compte « Entreprise » (lecture seule) : rien de ce qui concerne un·e alternant·e (filière, classe,
 * réseaux, pointeuse, carte de visite, abonnement calendrier…) — juste son nom, l'entreprise et le poste.
 */
function CompanyProfilePage({ user }: { user: User }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="card">
          <CompanyProfileForm firstName={user.firstName} lastName={user.lastName} companyName={user.companyName ?? ""} headline={user.headline ?? ""} />
        </div>
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Thème et mot de passe : <Link href="/parametres" className="text-accent underline">Paramètres</Link>.
          </p>
          <div className="card space-y-2">
            <h2 className="font-semibold">Mes données</h2>
            <p className="text-sm text-muted">Télécharge un fichier avec tes données personnelles.</p>
            <a href="/api/rgpd/export" className="btn-ghost w-fit"><Download size={15} aria-hidden /> Exporter mes données</a>
            <p className="text-xs text-muted"><Link href="/cgu" className="underline">CGU</Link> · <Link href="/mentions-legales" className="underline">Mentions légales</Link></p>
          </div>
          <div className="card space-y-2 border-danger">
            <h2 className="font-semibold">Supprimer mon compte</h2>
            <p className="text-sm text-muted">Efface définitivement ton compte et tes données.</p>
            <DeleteMyAccountForm email={user.email} />
          </div>
        </div>
      </div>
    </div>
  );
}

async function FicheTab({ user }: { user: User }) {
  const allTracks = await db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name));
  const allClasses = await db.select().from(classes).orderBy(asc(classes.sortOrder), asc(classes.name));
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[20rem_1fr]">
      <div className="card space-y-3">
        <h2 className="font-semibold">Ma photo</h2>
        <AvatarForm name={user.name} url={avatarUrl(user.avatarFile)} />
      </div>
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Ma fiche (annuaire de la promo)</h2>
          <Link href={`/annuaire/${user.id}`} className="btn-ghost text-xs">Voir ma fiche comme les autres</Link>
        </div>
        <FicheForm
          tracks={allTracks.map((t) => ({ id: t.id, name: t.name }))} trackId={user.trackId}
          classes={allClasses.map((c) => ({ id: c.id, name: c.name }))} classId={user.classId} headline={user.headline ?? ""} phone={user.phone ?? ""}
          contactEmail={user.contactEmail ?? ""} showInDirectory={user.showInDirectory} showPhone={user.showPhone} cardShowPhone={user.cardShowPhone} discord={user.discord ?? ""} cardShowDiscord={user.cardShowDiscord} cardShowSchool={user.cardShowSchool} showCompany={user.showCompany} companyName={user.companyName ?? ""} loginEmail={user.email} habilitation={user.habilitation ?? ""}
        />
      </div>
    </div>
  );
}

async function NetworksTab({ userId }: { userId: number }) {
  const links = await db.select().from(userLinks).where(eq(userLinks.userId, userId)).orderBy(asc(userLinks.sortOrder));
  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">Mes réseaux et mon portfolio</h2>
      <p className="text-sm text-muted">Ces liens apparaissent dans l&apos;annuaire et sur ta carte de visite.</p>
      <LinksEditor links={links.map((l) => ({ id: l.id, kind: l.kind, url: l.url, label: l.label }))} />
    </div>
  );
}

async function AlternanceTab({ user }: { user: User }) {
  const [colleagues, viewers] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(and(ne(users.id, user.id), eq(users.status, "active"))).orderBy(users.name),
    db.select({ id: agendaViewers.viewerUserId }).from(agendaViewers).where(eq(agendaViewers.ownerUserId, user.id)),
  ]);
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold">Pointeuse</h2>
        <p className="text-sm text-muted">La durée standard sert à calculer tes heures sup. Les référents voient ta pointeuse et tes statistiques en lecture seule.</p>
      </div>
      <TimeSettingsForm standardHours={user.standardWorkMinutes / 60} workDaysPerWeek={user.workDaysPerWeek} viewerIds={viewers.map((v) => v.id)} colleagues={colleagues} />

      <div className="border-t border-line pt-4">
        <h2 className="font-semibold">Restauration</h2>
        <p className="text-sm text-muted">Propre à toi : chaque contrat a ses propres plafonds. Utilisé pour calculer le remboursement dans les notes de frais.</p>
      </div>
      <RestoSettingsForm
        maxDay={user.restoMaxDayCents === null ? null : user.restoMaxDayCents / 100}
        maxMeal={user.restoMaxMealCents === null ? null : user.restoMaxMealCents / 100}
        tr={user.restoTrCents === null ? null : user.restoTrCents / 100}
        trMoment={user.restoTrMoment}
        autre={user.restoAutreCents === null ? null : user.restoAutreCents / 100}
      />
    </div>
  );
}

async function ShareTab({ user }: { user: User }) {
  // Adresses publiques : APP_URL si défini, sinon celle de la requête.
  const cardUrl = user.cardEnabled && user.cardSlug ? await absoluteUrl(`/carte/${user.cardSlug}`) : null;
  const qrSvg = cardUrl ? await QRCode.toString(cardUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) : null;
  const feedUrl = user.feedToken ? await absoluteUrl(`/api/feed/${user.feedToken}.ics`) : null;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="card space-y-3">
        <h2 className="font-semibold">Ma carte de visite en ligne</h2>
        <CardPanel enabled={user.cardEnabled} url={cardUrl} qrSvg={qrSvg} />
      </div>
      <div className="card space-y-3">
        <h2 className="font-semibold">Mon calendrier Backstage (abonnement)</h2>
        <FeedPanel enabled={!!user.feedToken} httpsUrl={feedUrl} />
      </div>
    </div>
  );
}
