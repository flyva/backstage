import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { tracks, userLinks } from "@/db/schema";
import { ProfileForm } from "@/components/forms";
import { AvatarForm, CardPanel, FicheForm, LinksEditor } from "@/components/people-forms";
import { avatarUrl } from "@/lib/avatar-files";
import { publicBaseUrl } from "@/lib/mail";

export const metadata = { title: "Profil" };

export default async function ProfilPage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser();
  const welcome = (await searchParams).bienvenue;
  const [allTracks, links] = await Promise.all([
    db.select().from(tracks).orderBy(asc(tracks.sortOrder), asc(tracks.name)),
    db.select().from(userLinks).where(eq(userLinks.userId, user.id)).orderBy(asc(userLinks.sortOrder)),
  ]);
  // Adresse publique de la carte : APP_URL si défini, sinon celle de la requête.
  let cardUrl: string | null = null;
  let qrSvg: string | null = null;
  if (user.cardEnabled && user.cardSlug) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
    const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
    cardUrl = `${publicBaseUrl() ?? `${proto}://${host}`}/carte/${user.cardSlug}`;
    qrSvg = await QRCode.toString(cardUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  }
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      {welcome && (
        <div className="card border-accent text-sm">
          Bienvenue sur Backstage ! Renseigne ton adresse et ton lien Ypareo pour personnaliser ton espace.
        </div>
      )}
      <div className="card">
        <ProfileForm firstName={user.firstName} lastName={user.lastName} homeAddress={user.homeAddress ?? ""} companyName={user.companyName ?? ""} companyAddress={user.companyAddress ?? ""} icalUrl={user.icalUrl ?? ""} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Ma photo</h2>
        <AvatarForm name={user.name} url={avatarUrl(user.avatarFile)} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Ma fiche (annuaire de la promo)</h2>
        <FicheForm
          tracks={allTracks.map((t) => ({ id: t.id, name: t.name }))} trackId={user.trackId} headline={user.headline ?? ""} phone={user.phone ?? ""}
          contactEmail={user.contactEmail ?? ""} showInDirectory={user.showInDirectory} showPhone={user.showPhone} loginEmail={user.email}
        />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Mes réseaux et mon portfolio</h2>
        <p className="text-sm text-muted">Ces liens apparaissent dans l&apos;annuaire et sur ta carte de visite.</p>
        <LinksEditor links={links.map((l) => ({ id: l.id, kind: l.kind, url: l.url, label: l.label }))} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Ma carte de visite en ligne</h2>
        <CardPanel enabled={user.cardEnabled} url={cardUrl} qrSvg={qrSvg} />
      </div>

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
  );
}
