import { requireUser } from "@/lib/auth";
import { ChangePasswordForm, ProfileForm } from "@/components/forms";
import { NotificationSettings } from "@/components/NotificationSettings";
import { pushEnabled, vapidPublicKey } from "@/lib/push";

export const metadata = { title: "Profil" };

export default async function ProfilPage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser();
  const welcome = (await searchParams).bienvenue;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      {welcome && (
        <div className="card border-accent text-sm">
          Bienvenue sur Backstage ! Renseigne ton adresse et ton lien Ypareo pour personnaliser ton espace.
        </div>
      )}
      <div className="card">
        <ProfileForm name={user.name} homeAddress={user.homeAddress ?? ""} icalUrl={user.icalUrl ?? ""} />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Mot de passe</h2>
        <ChangePasswordForm />
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Notifications</h2>
        <NotificationSettings
          publicKey={vapidPublicKey()}
          serverReady={pushEnabled()}
          initial={{ news: user.notifyNews, bde: user.notifyBde, loans: user.notifyLoans }}
        />
      </div>

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
