import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/forms";
import { SiteIconForm } from "@/components/SiteIconForm";
import { siteIconVersion } from "@/lib/site-icon";
import { ImportGuideButton } from "@/components/guide-forms";

export const metadata = { title: "Réglages généraux" };

export default async function AdminGeneralPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Réglages généraux</h2>

      <div className="space-y-8">
        <section className="card space-y-3">
          <h3 className="font-semibold">Guide de rentrée de l&apos;école</h3>
          <p className="text-sm text-muted">Remplit Backstage avec les informations du guide de rentrée 2026-2027 : annuaire des contacts, FAQ, liens utiles, pages du wiki, adresse de l&apos;école et Wi-Fi. Tu peux le relancer sans risque : rien de ce qui existe déjà n&apos;est écrasé.</p>
          <ImportGuideButton />
        </section>

        <section className="card space-y-3">
          <h3 className="font-semibold">Icône du site (favicon)</h3>
          <SiteIconForm version={await siteIconVersion()} />
        </section>

        <section className="card space-y-3">
          <h3 className="font-semibold">Paramètres de l&apos;école</h3>
          <SettingsForm values={settings as Record<string, string>} />
        </section>
      </div>
    </div>
  );
}
