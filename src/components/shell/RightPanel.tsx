import Link from "next/link";
import { Camera, Check, FilePlus2, Images, Newspaper, PartyPopper, Wifi, type LucideIcon } from "lucide-react";
import { SkinControls } from "@/components/shell/SkinControls";
import type { Accent, SidebarSkin, ThemeMode } from "@/lib/skin";

export type ActivityItem = { key: string; kind: "news" | "bde" | "gallery" | "loan"; text: string; when: string; href: string };

const KIND: Record<ActivityItem["kind"], { icon: LucideIcon; color: string }> = {
  news: { icon: Newspaper, color: "#17a2b8" },
  bde: { icon: PartyPopper, color: "#e11d74" },
  gallery: { icon: Images, color: "#7c5cff" },
  loan: { icon: Check, color: "#28a745" },
};

const SHORTCUTS = [
  { href: "/projets", icon: FilePlus2, label: "Nouveau projet" },
  { href: "/materiel", icon: Camera, label: "Demander du matériel" },
  { href: "/galerie", icon: Images, label: "Ajouter une photo" },
];

const title = "mb-2 text-xs font-semibold uppercase tracking-wider text-muted";

export function RightPanel({ skin, activity, hasWifi }: { skin: { theme: ThemeMode; accent: Accent; sidebar: SidebarSkin }; activity: ActivityItem[]; hasWifi: boolean }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className={title}>Personnalisation</h2>
        <SkinControls initial={skin} />
      </section>

      <section>
        <h2 className={title}>Raccourcis</h2>
        <ul className="space-y-1.5 text-sm">
          {SHORTCUTS.map(({ href, icon: Icon, label }) => (
            <li key={label}>
              <Link href={href} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 hover:border-accent">
                <Icon size={15} className="text-accent" /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {hasWifi && (
        <Link href="/ecole" className="block rounded-2xl p-3 text-sm text-accent-fg" style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #000))" }}>
          <span className="flex items-center gap-2 font-semibold"><Wifi size={16} /> Wi-Fi de l&apos;école</span>
          <span className="mt-1 block text-xs opacity-90">Scanne le QR code ou copie le mot de passe.</span>
        </Link>
      )}

      <section>
        <h2 className={title}>Activité récente</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted">Rien pour le moment.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {activity.map((a) => {
              const { icon: Icon, color } = KIND[a.kind];
              return (
                <li key={a.key}>
                  <Link href={a.href} className="flex gap-3 rounded-lg hover:bg-bg">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ background: color }}><Icon size={14} /></span>
                    <span className="min-w-0">
                      <span className="block leading-snug">{a.text}</span>
                      <span className="text-xs text-muted">{a.when}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
