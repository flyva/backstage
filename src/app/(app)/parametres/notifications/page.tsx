import { requireUser } from "@/lib/auth";
import { pushEnabled, vapidPublicKey } from "@/lib/push";
import { NotificationSettings } from "@/components/NotificationSettings";

export const metadata = { title: "Notifications" };

export default async function NotificationsSettingsPage() {
  const user = await requireUser();
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">Notifications sur ton téléphone ou ton ordinateur</h2>
        <p className="text-sm text-muted">Reçois une alerte pour les nouvelles actus, les évènements du BDE et le retour de ton matériel. La cloche en haut de l&apos;écran, elle, marche toujours.</p>
      </div>
      <NotificationSettings
        publicKey={vapidPublicKey()}
        serverReady={pushEnabled()}
        initial={{ news: user.notifyNews, bde: user.notifyBde, loans: user.notifyLoans }}
      />
    </section>
  );
}
