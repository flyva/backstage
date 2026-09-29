import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { skinFrom } from "@/lib/skin";
import { SkinControls } from "@/components/shell/SkinControls";

export const metadata = { title: "Personnalisation" };

export default async function PersonalizationPage() {
  await requireUser();
  const jar = await cookies();
  // Le skin affiché est celui des cookies (comme <html>) : le réglage montre exactement ce qui est appliqué.
  const skin = skinFrom({ theme: jar.get("theme")?.value, accent: jar.get("accent")?.value, sidebar: jar.get("sidebar")?.value });

  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold">Apparence</h2>
          <p className="text-sm text-muted">Les changements s&apos;appliquent tout de suite et sont enregistrés sur ton compte : tu les retrouves sur tous tes appareils.</p>
        </div>
        <SkinControls initial={skin} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Aperçu</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn">Bouton principal</button>
          <button type="button" className="btn-ghost">Bouton secondaire</button>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg">Badge</span>
          <span className="text-sm text-accent underline">Lien</span>
        </div>
      </section>
    </div>
  );
}
