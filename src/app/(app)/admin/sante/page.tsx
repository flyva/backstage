import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { runHealth, type Check, type Level } from "@/lib/health";

export const metadata = { title: "Santé du site" };
export const dynamic = "force-dynamic";

const ICON: Record<Level, { Icon: typeof Info; cls: string; label: string }> = {
  ok: { Icon: CheckCircle2, cls: "text-green-600 dark:text-green-400", label: "OK" },
  warn: { Icon: AlertTriangle, cls: "text-[#f59e0b]", label: "À surveiller" },
  error: { Icon: XCircle, cls: "text-danger", label: "Problème" },
  info: { Icon: Info, cls: "text-muted", label: "Information" },
};

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default async function HealthPage() {
  const checks = await runHealth();
  const groups = [...new Set(checks.map((c) => c.group))];
  const errors = checks.filter((c) => c.level === "error").length;
  const warns = checks.filter((c) => c.level === "warn").length;
  const summary = errors > 0 ? { text: `${errors} problème${errors > 1 ? "s" : ""} à régler`, level: "error" as const } : warns > 0 ? { text: `${warns} point${warns > 1 ? "s" : ""} à surveiller`, level: "warn" as const } : { text: "Tout va bien", level: "ok" as const };
  const S = ICON[summary.level];

  return (
    <div className="space-y-5">
      <section className="card flex flex-wrap items-center gap-3">
        <S.Icon size={28} className={S.cls} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{summary.text}</h2>
          <p className="text-sm text-muted">Vérifié à {timeFmt.format(new Date())}. Les services externes sont vérifiés toutes les 5 minutes au plus.</p>
        </div>
        <Link href="/admin/sante" className="btn-ghost">Actualiser</Link>
      </section>

      {groups.map((g) => (
        <section key={g} className="card space-y-1">
          <h2 className="font-semibold">{g}</h2>
          <ul className="divide-y divide-line">
            {checks.filter((c: Check) => c.group === g).map((c) => {
              const { Icon, cls, label } = ICON[c.level];
              return (
                <li key={c.name} className="flex items-start gap-3 py-2.5 text-sm">
                  <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} aria-label={label} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="break-words text-muted">{c.detail}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-muted">
        Pour une surveillance automatique, <code className="rounded bg-bg px-1">/api/health</code> répond 200 si la base fonctionne (503 sinon), sans rien révéler. Cloudflare peut afficher une vérification aux outils automatiques : autorise-les dans ses règles de sécurité.
      </p>
    </div>
  );
}
