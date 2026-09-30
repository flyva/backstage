import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { tracks, userLinks } from "@/db/schema";
import { ProfileForm } from "@/components/forms";
import { AvatarForm, CardPanel, FeedPanel, FicheForm, LinksEditor } from "@/components/people-forms";
import { avatarUrl } from "@/lib/avatar-files";
import { absoluteUrl } from "@/lib/base-url";

export const metadata = { title: "Profil" };

// Quatre onglets : la page était une longue suite de cartes. L'onglet se choisit par l'adresse (?onglet=…), sans JavaScript.
// « short » : libellé court pour les téléphones, afin que les quatre onglets tiennent sans faire défiler la barre.
const TABS = [
  { id: "general", label: "Général", short: "Général" },
  { id: "fiche", label: "Photo et fiche", short: "Fiche" },
  { id: "reseaux", label: "Réseaux", short: "Réseaux" },
  { id: "partage", label: "Carte et calendrier", short: "Carte" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function ProfilPage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser();
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
          </div>
        </div>
      )}

      {tab === "fiche" && <FicheTab user={user} />}
      {tab === "reseaux" && <NetworksTab userId={user.id} />}
      {tab === "partage" && <ShareTab user={user} />}
    </div>
  );
}

type User = Awaited<ReturnType<typeof requireUser>>;

async function FicheTab({ user }: { user: User }) {
  const allTracks = await db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name));
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
          tracks={allTracks.map((t) => ({ id: t.id, name: t.name }))} trackId={user.trackId} headline={user.headline ?? ""} phone={user.phone ?? ""}
          contactEmail={user.contactEmail ?? ""} showInDirectory={user.showInDirectory} showPhone={user.showPhone} cardShowPhone={user.cardShowPhone} discord={user.discord ?? ""} cardShowDiscord={user.cardShowDiscord} cardShowSchool={user.cardShowSchool} showCompany={user.showCompany} companyName={user.companyName ?? ""} loginEmail={user.email}
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
