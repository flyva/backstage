import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { Bell, Briefcase, Calendar, CircleHelp, CreditCard, Download, GraduationCap, Headset, Link2, Palette, Shield, Users, UserRound } from "lucide-react";
import QRCode from "qrcode";
import { db } from "@/db";
import { agendaViewers, classes, tracks, userFormations, userLinks, users } from "@/db/schema";
import { ChangePasswordForm, IcalForm, ProfileForm } from "@/components/forms";
import { AnnuaireForm, Avatar, AvatarForm, CardPanel, CardVisibilityForm, CompanyProfileForm, DeleteMyAccountForm, FeedPanel, FormationPicker, LinksEditor, PromotionPicker } from "@/components/people-forms";
import { TimeSettingsForm } from "@/components/time-forms";
import { RestoSettingsForm } from "@/components/alternance-forms";
import { SkinControls } from "@/components/shell/SkinControls";
import { NotificationSettings } from "@/components/NotificationSettings";
import { logout } from "@/lib/actions";
import { setStudentStatus } from "@/lib/people-actions";
import { skinFrom } from "@/lib/skin";
import { pushEnabled, vapidPublicKey } from "@/lib/push";
import { avatarUrl } from "@/lib/avatar-files";
import { absoluteUrl } from "@/lib/base-url";

export const metadata = { title: "Profil" };

// Menu vertical repris à l'identique de celui du profil BDE (src/app/(app)/profil/ProfilClient.tsx) : un bloc avatar
// en haut, des rubriques groupées par titre en petites majuscules, un indicateur de couleur à gauche de l'item actif,
// la déconnexion tout en bas. Mêmes groupes et mêmes noms que BDE (Profil, Alternance/Stage, Confidentialité, Aide) ;
// Ma promo s'ajoute dans le groupe Profil (spécifique à Backstage, inexistant côté BDE). L'onglet se choisit par
// l'adresse (?onglet=…), sans JavaScript.
function groupsFor(isAlternant: boolean) {
  return [
    {
      title: "Profil",
      items: [
        { id: "general", label: "Profil", icon: UserRound },
        { id: "annuaire", label: "Annuaire", icon: Users },
        { id: "promo", label: "Ma promo", icon: GraduationCap },
        { id: "carte", label: "Carte de visite", icon: CreditCard },
        { id: "apparence", label: "Apparence", icon: Palette },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "agenda", label: "Agenda", icon: Calendar },
        { id: "reseaux", label: "Réseaux", icon: Link2 },
      ],
    },
    {
      title: isAlternant ? "Alternance" : "Stage",
      items: [{ id: "alternance", label: isAlternant ? "Mon alternance" : "Mon stage", icon: Briefcase }],
    },
    {
      title: "Confidentialité",
      items: [{ id: "confidentialite", label: "Confidentialité & mes données", icon: Shield }],
    },
    {
      title: "Aide",
      items: [
        { id: "aide-support", label: "Support / Tickets", icon: Headset },
        { id: "aide-faq", label: "FAQ", icon: CircleHelp },
      ],
    },
  ] as const;
}
type TabId = ReturnType<typeof groupsFor>[number]["items"][number]["id"];

export default async function ProfilPage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser();
  if (user.perms.companyOnly) return <CompanyProfilePage user={user} />;
  const sp = await searchParams;
  const welcome = sp.bienvenue;
  const isAlternant = user.studentStatus === "alternant";
  const groups = groupsFor(isAlternant);
  const allIds = groups.flatMap((g) => g.items.map((i) => i.id));
  let tab: TabId = (allIds as readonly string[]).includes(sp.onglet as string) ? (sp.onglet as TabId) : "general";
  if (tab === "alternance" && !user.companyName) tab = "general";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      {welcome && (
        <div className="card border-accent text-sm">
          Bienvenue sur Backstage ! Renseigne ton adresse et ton lien Ypareo pour personnaliser ton espace.
        </div>
      )}

      <div className="flex flex-col gap-5 md:flex-row">
        <nav className="card flex shrink-0 flex-col gap-0 p-0 md:w-64" aria-label="Sections du profil">
          <div className="flex items-center gap-3 border-b border-line p-3">
            <Avatar name={user.name} url={avatarUrl(user.avatarFile)} size={44} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 overflow-x-auto p-2 md:overflow-visible">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">{g.title}</div>
                <ul className="space-y-0.5">
                  {g.items.map((it) => {
                    // Tant que l'entreprise d'alternance/stage n'est pas renseignée (onglet Profil > Coordonnées),
                    // rien à montrer ici : l'item est grisé plutôt que de mener à une page vide.
                    const disabled = it.id === "alternance" && !user.companyName;
                    if (disabled) {
                      return (
                        <li key={it.id}>
                          <span
                            className="flex cursor-not-allowed items-center gap-2.5 whitespace-nowrap rounded-r-lg border-l-[3px] border-transparent px-2.5 py-1.5 text-sm text-muted/50"
                            title="Renseigne d'abord ton entreprise dans Profil > Coordonnées"
                          >
                            <it.icon size={16} />
                            {it.label}
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={it.id}>
                        <Link
                          href={`/profil?onglet=${it.id}`}
                          aria-current={it.id === tab ? "page" : undefined}
                          className={`flex items-center gap-2.5 whitespace-nowrap rounded-r-lg border-l-[3px] px-2.5 py-1.5 text-sm ${
                            it.id === tab ? "border-accent bg-bg font-bold text-fg" : "border-transparent text-muted hover:bg-bg hover:text-fg"
                          }`}
                        >
                          <it.icon size={16} className={it.id === tab ? "text-accent" : undefined} />
                          {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <form action={logout} className="mt-auto border-t border-line p-2">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-danger hover:bg-bg">
              <LogOutIcon /> Déconnexion
            </button>
          </form>
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          {tab === "general" && <GeneralTab user={user} />}
          {tab === "promo" && <PromoTab user={user} />}
          {tab === "annuaire" && <AnnuaireTab user={user} />}
          {tab === "carte" && <CarteTab user={user} />}
          {tab === "apparence" && <ApparenceTab user={user} />}
          {tab === "notifications" && <NotificationsTab user={user} />}
          {tab === "agenda" && <AgendaTab user={user} />}
          {tab === "reseaux" && <NetworksTab userId={user.id} />}
          {tab === "alternance" && <AlternanceTab user={user} isAlternant={isAlternant} />}
          {tab === "confidentialite" && <ConfidentialiteTab email={user.email} />}
          {tab === "aide-support" && <AideSupportTab />}
          {tab === "aide-faq" && <AideFaqTab />}
        </div>
      </div>
    </div>
  );
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// Bloc visuel « Section » : même présentation que les sous-sections Identité/Coordonnées/Sécurité du profil BDE.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

function GeneralTab({ user }: { user: User }) {
  const birthDate = user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : "";
  return (
    <div className="card max-w-xl space-y-6">
      <Section title="Photo">
        <AvatarForm name={user.name} url={avatarUrl(user.avatarFile)} />
      </Section>
      {/* Identité + Coordonnées : un seul formulaire, un seul bouton Enregistrer (les deux titres de section sont rendues par ProfileForm lui-même). */}
      <ProfileForm
        firstName={user.firstName} lastName={user.lastName} email={user.email} personalEmail={user.personalEmail ?? ""}
        homeAddress={user.homeAddress ?? ""} companyName={user.companyName ?? ""} companyAddress={user.companyAddress ?? ""}
        phone={user.phone ?? ""} phonePro={user.phonePro ?? ""} birthDate={birthDate} discord={user.discord ?? ""}
      />
      <Section title="Sécurité">
        <ChangePasswordForm />
      </Section>
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

async function AnnuaireTab({ user }: { user: User }) {
  const allTracks = await db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name));
  const allClasses = await db.select().from(classes).orderBy(asc(classes.sortOrder), asc(classes.name));
  return (
    <div className="card max-w-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Mon annuaire de la promo</h2>
        <Link href={`/annuaire/${user.id}`} className="btn-ghost text-xs">Voir ma fiche comme les autres</Link>
      </div>
      <AnnuaireForm
        tracks={allTracks.map((t) => ({ id: t.id, name: t.name }))} trackId={user.trackId}
        classes={allClasses.map((c) => ({ id: c.id, name: c.name }))} classId={user.classId} headline={user.headline ?? ""} phone={user.phone ?? ""}
        contactEmail={user.contactEmail ?? ""} showInDirectory={user.showInDirectory} showPhone={user.showPhone} discord={user.discord ?? ""} showCompany={user.showCompany} companyName={user.companyName ?? ""} loginEmail={user.email} habilitation={user.habilitation ?? ""}
      />
    </div>
  );
}

async function PromoTab({ user }: { user: User }) {
  const [allTracks, allClasses, mine] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select().from(classes).orderBy(asc(classes.sortOrder), asc(classes.name)),
    db.select({ id: userFormations.id, trackId: userFormations.trackId, year: userFormations.year, createdAt: userFormations.createdAt, trackName: tracks.name, shortName: tracks.shortName })
      .from(userFormations).innerJoin(tracks, eq(userFormations.trackId, tracks.id))
      .where(eq(userFormations.userId, user.id)).orderBy(desc(userFormations.createdAt)),
  ]);
  return (
    <div className="space-y-5">
      <div className="card max-w-2xl space-y-3">
        <h2 className="font-semibold">Mes formations</h2>
        <p className="text-sm text-muted">Tu peux avoir suivi plusieurs formations (ex. 1 an en Technicien puis 1ère année en Régisseur) : elles s&apos;ajoutent en tags, sans rien effacer.</p>
        <FormationPicker tracks={allTracks.map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, yearsCount: t.yearsCount }))} myFormations={mine} />
      </div>
      <div className="card max-w-md space-y-3">
        <h2 className="font-semibold">Ma promo</h2>
        <PromotionPicker classes={allClasses.map((c) => ({ id: c.id, name: c.name, startYear: c.startYear, endYear: c.endYear }))} classId={user.classId} />
      </div>
      <div className="card max-w-md space-y-3">
        <h2 className="font-semibold">Mon statut</h2>
        <p className="text-sm text-muted">Change le libellé « Alternance »/« Stage » dans le menu et sur « Mon alternance ».</p>
        <form action={setStudentStatus} className="flex gap-2">
          <button name="studentStatus" value="alternant" className={`rounded-full border px-3 py-1 text-sm ${user.studentStatus === "alternant" ? "border-accent bg-accent text-accent-fg" : "border-line text-muted hover:text-fg"}`}>Alternant·e</button>
          <button name="studentStatus" value="initial" className={`rounded-full border px-3 py-1 text-sm ${user.studentStatus !== "alternant" ? "border-accent bg-accent text-accent-fg" : "border-line text-muted hover:text-fg"}`}>Initial (stage)</button>
        </form>
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

async function AlternanceTab({ user, isAlternant }: { user: User; isAlternant: boolean }) {
  const label = isAlternant ? "alternance" : "stage";
  const [colleagues, viewers] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(and(ne(users.id, user.id), eq(users.status, "active"))).orderBy(users.name),
    db.select({ id: agendaViewers.viewerUserId }).from(agendaViewers).where(eq(agendaViewers.ownerUserId, user.id)),
  ]);
  return (
    <div className="card space-y-4">
      <div className="border-t-0 pt-0">
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
      <p className="text-xs text-muted">Adresse de {label} : renseignée dans l&apos;onglet Profil, section « Entreprise (alternance) ».</p>
    </div>
  );
}

async function CarteTab({ user }: { user: User }) {
  // Adresse publique : APP_URL si défini, sinon celle de la requête.
  const cardUrl = user.cardEnabled && user.cardSlug ? await absoluteUrl(`/carte/${user.cardSlug}`) : null;
  const qrSvg = cardUrl ? await QRCode.toString(cardUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) : null;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="card space-y-3">
        <h2 className="font-semibold">Ma carte de visite en ligne</h2>
        <CardPanel enabled={user.cardEnabled} url={cardUrl} qrSvg={qrSvg} />
      </div>
      <div className="card space-y-3">
        <h2 className="font-semibold">Ce qu&apos;elle affiche</h2>
        <CardVisibilityForm cardShowPhone={user.cardShowPhone} cardShowDiscord={user.cardShowDiscord} cardShowSchool={user.cardShowSchool} />
      </div>
    </div>
  );
}

function ApparenceTab({ user }: { user: User }) {
  const skin = skinFrom({ theme: user.theme });
  return (
    <div className="card max-w-md space-y-3">
      <h2 className="font-semibold">Apparence</h2>
      <p className="text-sm text-muted">S&apos;applique tout de suite et sur tous tes appareils.</p>
      <SkinControls initial={skin} />
    </div>
  );
}

function NotificationsTab({ user }: { user: User }) {
  return (
    <div className="card max-w-xl space-y-3">
      <h2 className="font-semibold">Notifications sur ton téléphone ou ton ordinateur</h2>
      <p className="text-sm text-muted">Reçois une alerte pour les nouvelles actus, les évènements du BDE et le retour de ton matériel. La cloche en haut de l&apos;écran, elle, marche toujours.</p>
      <NotificationSettings
        publicKey={vapidPublicKey()}
        serverReady={pushEnabled()}
        initial={{ news: user.notifyNews, bde: user.notifyBde, loans: user.notifyLoans, reminders: user.notifyReminders, messages: user.notifyMessages, listings: user.notifyListings, updates: user.notifyUpdates, emptyPointeuse: user.notifyEmptyPointeuse }}
      />
    </div>
  );
}

async function AgendaTab({ user }: { user: User }) {
  const feedUrl = user.feedToken ? await absoluteUrl(`/api/feed/${user.feedToken}.ics`) : null;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="card space-y-3">
        <h2 className="font-semibold">Lien iCal (Ypareo / autre)</h2>
        <IcalForm icalUrl={user.icalUrl ?? ""} />
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Comment obtenir mon lien iCalendar Ypareo ?</summary>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>Connecte-toi à Ypareo.</li>
            <li>Ouvre <strong className="text-fg">Planning</strong>.</li>
            <li>Clique sur <strong className="text-fg">Action</strong>.</li>
            <li>Choisis <strong className="text-fg">Export au format iCalendar</strong>.</li>
            <li>Copie le lien généré et colle-le dans le champ ci-dessus.</li>
          </ol>
          <p className="mt-2 text-xs">Ce lien donne accès à ton planning : ne le partage pas. Backstage l&apos;utilisera pour ton agenda.</p>
        </details>
      </div>
      <div className="card space-y-3">
        <h2 className="font-semibold">Mon calendrier Backstage (abonnement)</h2>
        <FeedPanel enabled={!!user.feedToken} httpsUrl={feedUrl} />
      </div>
    </div>
  );
}

function ConfidentialiteTab({ email }: { email: string }) {
  return (
    <div className="max-w-xl space-y-4">
      <div className="card space-y-2">
        <h2 className="flex items-center gap-2 font-semibold"><Shield size={16} className="text-accent" aria-hidden /> Exporter mes données</h2>
        <p className="text-sm text-muted">Télécharge un fichier avec tes données personnelles : profil, journal de bord, pointeuse, messages envoyés, avis, notes de frais.</p>
        <a href="/api/rgpd/export" className="btn-ghost w-fit"><Download size={15} aria-hidden /> Exporter mes données</a>
      </div>
      <div className="card space-y-2 border-danger">
        <h2 className="font-semibold">Supprimer mon compte</h2>
        <p className="text-sm text-muted">Efface définitivement ton compte et tes données. Impossible si tu as créé du contenu partagé (projets, annonces, articles, prêts…) : demande à un administrateur de désactiver ton compte à la place.</p>
        <DeleteMyAccountForm email={email} />
      </div>
      <p className="text-xs text-muted">
        <Link href="/politique-de-confidentialite" className="underline">Politique de confidentialité</Link> · <Link href="/cgu" className="underline">CGU</Link> · <Link href="/mentions-legales" className="underline">Mentions légales</Link>
      </p>
    </div>
  );
}

function AideSupportTab() {
  return (
    <div className="card max-w-xl space-y-2">
      <h2 className="flex items-center gap-2 font-semibold"><Headset size={16} className="text-accent" aria-hidden /> Support / Tickets</h2>
      <p className="text-sm text-muted">Crée un ticket ou consulte l&apos;avancement de tes demandes auprès de l&apos;équipe.</p>
      <Link href="/tickets" className="btn-ghost w-fit">Voir mes tickets</Link>
    </div>
  );
}

function AideFaqTab() {
  return (
    <div className="card max-w-xl space-y-2">
      <h2 className="flex items-center gap-2 font-semibold"><CircleHelp size={16} className="text-accent" aria-hidden /> FAQ</h2>
      <p className="text-sm text-muted">Questions fréquentes sur l&apos;appli et les services de la promo.</p>
      <Link href="/faq" className="btn-ghost w-fit">Consulter la FAQ</Link>
    </div>
  );
}
