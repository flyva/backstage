import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/forms";

export const metadata = { title: "Sécurité" };

export default async function SecuritySettingsPage() {
  const user = await requireUser();
  const external = user.googleSub ? "Google" : user.msOid ? "Microsoft" : null;

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Mot de passe</h2>
      {external ? (
        <p className="text-sm text-muted">
          Ton compte est relié à <strong className="text-fg">{external}</strong> : tu te connectes avec le bouton {external} et tu n&apos;as pas de mot de passe Backstage à gérer.
        </p>
      ) : (
        <ChangePasswordForm />
      )}
    </section>
  );
}
