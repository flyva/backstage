import "server-only";
import os from "node:os";
import path from "node:path";
import { readFile, readdir, stat, statfs } from "node:fs/promises";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { cached } from "@/lib/mobility";

// Tableau de santé du site (administration) : base de données, mémoire, disque, sauvegardes, services externes, configuration.

export type Level = "ok" | "warn" | "error" | "info";
export type Check = { group: string; name: string; level: Level; detail: string };

const fmtBytes = (n: number) => (n >= 1 << 30 ? `${(n / (1 << 30)).toFixed(1)} Go` : n >= 1 << 20 ? `${Math.round(n / (1 << 20))} Mo` : `${Math.round(n / 1024)} Ko`);
const fmtDuration = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d} j ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
};

/** Mémoire réellement disponible : « MemAvailable » sous Linux (cache réutilisable compris), sinon la mémoire libre du système. */
async function memoryInfo(): Promise<{ available: number; total: number; swapUsed: number | null }> {
  try {
    const txt = await readFile("/proc/meminfo", "utf8");
    const kb = (k: string) => Number(new RegExp(`^${k}:\\s+(\\d+)`, "m").exec(txt)?.[1] ?? NaN) * 1024;
    const available = kb("MemAvailable");
    if (Number.isFinite(available)) {
      const swapTotal = kb("SwapTotal");
      const swapFree = kb("SwapFree");
      return { available, total: kb("MemTotal"), swapUsed: Number.isFinite(swapTotal) && swapTotal > 0 ? swapTotal - swapFree : null };
    }
  } catch {
    /* pas de /proc (Windows, macOS) */
  }
  return { available: os.freemem(), total: os.totalmem(), swapUsed: null };
}

/** Vrai si la base répond : utilisé par /api/health (aucun détail exposé). */
export async function databaseAlive(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function dirSize(dir: string, depth = 0): Promise<number> {
  if (depth > 4) return 0;
  let total = 0;
  try {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      total += e.isDirectory() ? await dirSize(p, depth + 1) : (await stat(p).catch(() => null))?.size ?? 0;
    }
  } catch {
    /* dossier absent */
  }
  return total;
}

async function ping(name: string, url: string): Promise<Check> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store", headers: { "User-Agent": "Backstage-health" } });
    const ms = Date.now() - t0;
    if (!res.ok && res.status >= 500) return { group: "Services externes", name, level: "error", detail: `Erreur ${res.status}` };
    return { group: "Services externes", name, level: ms > 3000 ? "warn" : "ok", detail: `Répond en ${ms} ms` };
  } catch {
    return { group: "Services externes", name, level: "error", detail: "Injoignable (délai dépassé ou réseau coupé)" };
  }
}

export async function runHealth(): Promise<Check[]> {
  const checks: Check[] = [];
  const add = (group: string, name: string, level: Level, detail: string) => checks.push({ group, name, level, detail });

  // --- Base de données ---
  const t0 = Date.now();
  try {
    const [{ total }] = await db.select({ total: count() }).from(users);
    const [{ active }] = await db.select({ active: count() }).from(users).where(eq(users.status, "active"));
    const ms = Date.now() - t0;
    add("Serveur", "Base de données", ms > 500 ? "warn" : "ok", `Répond en ${ms} ms · ${active} compte(s) actif(s) sur ${total}`);
  } catch {
    add("Serveur", "Base de données", "error", "Ne répond pas : vérifie MariaDB et DATABASE_URL");
  }

  // --- Mémoire ---
  const rss = process.memoryUsage().rss;
  const mem = await memoryInfo();
  add("Serveur", "Mémoire du site", rss > 400 * (1 << 20) ? "warn" : "ok", `${fmtBytes(rss)} utilisés par Backstage (limite du service : 450 Mo)`);
  add("Serveur", "Mémoire de la machine", mem.available < 100 * (1 << 20) ? "warn" : "ok", `${fmtBytes(mem.available)} disponibles sur ${fmtBytes(mem.total)}${mem.swapUsed !== null ? ` · swap utilisé : ${fmtBytes(mem.swapUsed)}` : ""}`);
  add("Serveur", "Temps de fonctionnement", "info", `${fmtDuration(process.uptime())} depuis le dernier démarrage · Node ${process.version}`);

  // --- Disque ---
  try {
    const s = await statfs(process.cwd());
    const freeB = s.bavail * s.bsize;
    const totalB = s.blocks * s.bsize;
    const pct = (freeB / totalB) * 100;
    add("Serveur", "Espace disque", pct < 5 ? "error" : pct < 15 || freeB < 500 * (1 << 20) ? "warn" : "ok", `${fmtBytes(freeB)} libres sur ${fmtBytes(totalB)} (${Math.round(pct)} %)`);
  } catch {
    add("Serveur", "Espace disque", "info", "Non disponible sur ce système");
  }
  const uploads = await dirSize(path.join(process.cwd(), "data", "uploads"));
  const quota = Number(process.env.GALLERY_MAX_MB || 0);
  add("Serveur", "Fichiers envoyés", "info", `${fmtBytes(uploads)} (photos, plans, galerie)${quota ? ` · quota galerie ${quota} Mo` : ""}`);

  // --- Sauvegardes ---
  const backupDir = process.env.BACKUP_DIR || "/opt/backstage/backups";
  try {
    const files = (await readdir(backupDir)).filter((f) => /^db-.*\.sql\.gz$/.test(f));
    const stats = await Promise.all(files.map(async (f) => ({ f, s: await stat(path.join(backupDir, f)) })));
    const last = stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs)[0];
    if (!last) add("Sauvegardes", "Dernière sauvegarde", "warn", "Aucune sauvegarde trouvée : vérifie backstage-backup.timer");
    else {
      const ageH = (Date.now() - last.s.mtimeMs) / 3600e3;
      add("Sauvegardes", "Dernière sauvegarde", ageH > 36 ? "warn" : "ok", `il y a ${ageH < 1 ? "moins d'1 h" : `${Math.round(ageH)} h`} (${fmtBytes(last.s.size)}) · ${stats.length} sauvegarde(s) conservée(s)`);
    }
  } catch {
    add("Sauvegardes", "Dernière sauvegarde", "info", `Dossier ${backupDir} illisible depuis le site (normal en développement)`);
  }

  // --- Configuration ---
  const has = (v?: string) => !!v?.trim();
  add("Configuration", "E-mails (mot de passe oublié, confirmation)", has(process.env.MAIL_HOST) && has(process.env.APP_URL) ? "ok" : "warn", has(process.env.MAIL_HOST) ? (has(process.env.APP_URL) ? "Envoi configuré" : "MAIL_HOST défini mais APP_URL manque") : "Non configuré : aucun mail n'est envoyé");
  add("Configuration", "Notifications push", has(process.env.VAPID_PUBLIC_KEY) && has(process.env.VAPID_PRIVATE_KEY) && has(process.env.VAPID_SUBJECT) ? "ok" : "warn", has(process.env.VAPID_PUBLIC_KEY) ? "Clés VAPID présentes" : "Clés VAPID absentes");
  add("Configuration", "Rappels quotidiens (CRON_SECRET)", has(process.env.CRON_SECRET) ? "ok" : "warn", has(process.env.CRON_SECRET) ? "Défini" : "Manquant : les rappels de 7 h 30 sont refusés");
  add("Configuration", "Code d'invitation (REGISTRATION_CODE)", "info", has(process.env.REGISTRATION_CODE) ? "Défini : l'inscription exige ce code" : "Non défini");
  add("Configuration", "Connexion Google", "info", has(process.env.GOOGLE_CLIENT_ID) && has(process.env.GOOGLE_CLIENT_SECRET) ? "Configurée" : "Non configurée (bouton masqué)");
  add("Configuration", "Connexion Microsoft", "info", has(process.env.MS_CLIENT_ID) ? "Configurée" : "Non configurée");
  add("Configuration", "Trafic routier (TomTom)", "info", has(process.env.TOMTOM_API_KEY) ? "Clé présente" : "Sans clé : temps en voiture sans embouteillages");
  add("Configuration", "Adresse publique (APP_URL)", has(process.env.APP_URL) ? "ok" : "warn", has(process.env.APP_URL) ? (process.env.APP_URL as string) : "Non définie");

  // --- Services externes (résultat gardé 5 minutes) ---
  const external = await cached("health:external", 5 * 60e3, () =>
    Promise.all([
      ping("Transitous (itinéraires)", "https://api.transitous.org/api/v1/geocode?text=Bordeaux"),
      ping("TBM (horaires en direct)", "https://bdx.mecatran.com/utw/ws/siri/2.0/bordeaux/lines-discovery.json?AccountKey=opendata-bordeaux-metropole-flux-gtfs-rt"),
      ping("Météo (Open-Meteo)", "https://api.open-meteo.com/v1/forecast?latitude=44.84&longitude=-0.58&current=temperature_2m"),
      ping("Adresses (BAN)", "https://api-adresse.data.gouv.fr/search/?q=bordeaux&limit=1"),
    ]),
  );
  checks.push(...(external ?? []));
  return checks;
}
