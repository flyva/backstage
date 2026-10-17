import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { Archive, Cloud, Database, FolderArchive, HardDrive, Server, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Sauvegardes" };
export const dynamic = "force-dynamic";

const fmtBytes = (n: number) => (n >= 1 << 30 ? `${(n / (1 << 30)).toFixed(1)} Go` : n >= 1 << 20 ? `${Math.round(n / (1 << 20))} Mo` : `${Math.round(n / 1024)} Ko`);
const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });

const UPLOAD_FOLDERS = [
  { dir: "avatars", label: "Photos de profil" },
  { dir: "listings", label: "Photos des annonces" },
  { dir: "gallery", label: "Galerie (photos/vidéos BDE)" },
  { dir: "messages", label: "Pièces jointes de la messagerie (photos, GIF, fichiers)" },
  { dir: "projects", label: "Fichiers des projets" },
  { dir: "tickets", label: "Pièces jointes des tickets de support" },
  { dir: "wiki", label: "Images et fichiers du wiki" },
  { dir: "site", label: "Icône du site, plan de l'école" },
];

type Pair = { stamp: string; date: Date; dbSize: number | null; uploadsSize: number | null };

export default async function BackupsPage() {
  await requireAdmin();
  const backupDir = process.env.BACKUP_DIR || "/opt/backstage/backups";
  const remoteConfigured = !!process.env.REMOTE_DB_URL?.trim();
  const rcloneConfigured = !!process.env.RCLONE_REMOTE?.trim();

  let pairs: Pair[] = [];
  let dirError: string | null = null;
  try {
    const files = await readdir(/*turbopackIgnore: true*/ backupDir);
    const byStamp = new Map<string, Pair>();
    for (const f of files) {
      const dbMatch = /^db-(.+)\.sql\.gz$/.exec(f);
      const upMatch = /^uploads-(.+)\.tar\.gz$/.exec(f);
      const stamp = dbMatch?.[1] ?? upMatch?.[1];
      if (!stamp) continue;
      const s = await stat(path.join(/*turbopackIgnore: true*/ backupDir, f));
      const entry = byStamp.get(stamp) ?? { stamp, date: s.mtime, dbSize: null, uploadsSize: null };
      if (dbMatch) entry.dbSize = s.size; else entry.uploadsSize = s.size;
      entry.date = s.mtime;
      byStamp.set(stamp, entry);
    }
    pairs = [...byStamp.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    dirError = `Dossier ${backupDir} illisible depuis le site (normal en développement : les sauvegardes n'existent que sur le Pi en production).`;
  }

  const last = pairs[0];
  const lastAgeH = last ? (new Date().getTime() - last.date.getTime()) / 3600e3 : null;

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-accent" /> Ce que ça sauvegarde</h2>
        <p className="text-sm text-muted">Chaque nuit à 3 h, deux choses sont enregistrées :</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3">
            <p className="flex items-center gap-2 text-sm font-medium"><Database size={15} className="text-accent" aria-hidden /> La base de données entière</p>
            <p className="mt-1 text-xs text-muted">Tous les comptes, projets, messages, pages du wiki, annonces, tickets, pointeuses, réglages… toutes les tables, un dump SQL complet.</p>
          </div>
          <div className="rounded-xl border border-line bg-bg p-3">
            <p className="flex items-center gap-2 text-sm font-medium"><FolderArchive size={15} className="text-accent" aria-hidden /> Les fichiers envoyés</p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              {UPLOAD_FOLDERS.map((f) => <li key={f.dir}>• {f.label}</li>)}
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted">Conservées <strong className="text-fg">14 jours</strong> sur la carte SD du Pi (<code className="text-xs">/opt/backstage/backups</code>), puis supprimées automatiquement.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><HardDrive size={18} aria-hidden /></span>
          <div>
            <div className="text-sm font-semibold">{last ? `il y a ${lastAgeH! < 1 ? "moins d'1 h" : `${Math.round(lastAgeH!)} h`}` : dirError ? "Inconnu" : "Aucune pour l'instant"}</div>
            <div className="text-xs text-muted">Dernière sauvegarde locale{last && lastAgeH! > 36 ? " — en retard, vérifie backstage-backup.timer" : ""}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${remoteConfigured ? "bg-accent/10 text-accent" : "bg-bg text-muted"}`}><Server size={18} aria-hidden /></span>
          <div>
            <div className="text-sm font-semibold">{remoteConfigured ? "Activé" : "Non configuré"}</div>
            <div className="text-xs text-muted">Miroir distant (base MySQL externe, ex. OVH)</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${rcloneConfigured ? "bg-accent/10 text-accent" : "bg-bg text-muted"}`}><Cloud size={18} aria-hidden /></span>
          <div>
            <div className="text-sm font-semibold">{rcloneConfigured ? "Activé" : "Non configuré"}</div>
            <div className="text-xs text-muted">Copie distante (ex. Google Drive, via rclone)</div>
          </div>
        </div>
      </div>

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold"><Archive size={18} className="text-accent" /> Sauvegardes conservées ({pairs.length})</h2>
        {dirError && <p className="text-sm text-muted">{dirError}</p>}
        {!dirError && pairs.length === 0 && <p className="text-sm text-muted">Aucune sauvegarde trouvée : vérifie que <code className="text-xs">backstage-backup.timer</code> tourne sur le Pi.</p>}
        {pairs.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {pairs.map((p) => (
              <li key={p.stamp} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="min-w-0 flex-1 font-medium">{dateFmt.format(p.date)}</span>
                <span className="text-xs text-muted">{p.dbSize !== null ? `Base : ${fmtBytes(p.dbSize)}` : "Base : —"}</span>
                <span className="text-xs text-muted">{p.uploadsSize !== null ? `Fichiers : ${fmtBytes(p.uploadsSize)}` : "Fichiers : —"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Restaurer</h2>
        <p className="text-sm text-muted">Depuis un PC, après avoir récupéré les fichiers (<code className="text-xs">scp pi@raspberrypi.local:/opt/backstage/backups/* ./</code>) :</p>
        <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs"><code>{`gunzip -c db-AAAAMMJJ-HHMM.sql.gz | mysql -u backstage -p backstage
sudo tar -xzf uploads-AAAAMMJJ-HHMM.tar.gz -C /opt/backstage/data`}</code></pre>
        <p className="text-xs text-muted">Détails complets dans DEPLOY.md, section 9 (y compris la mise en place du miroir MySQL distant et de la copie Google Drive).</p>
      </section>
    </div>
  );
}
