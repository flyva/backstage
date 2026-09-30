// Construit l'archive de déploiement : dist/backstage-<date>.tar.gz
//   npm run package
// À lancer sur le PC (jamais sur le Pi : trop peu de RAM pour compiler Next.js).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "dist");
const stage = path.join(out, "backstage");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

console.log("→ Compilation de production…");
run("npm", ["run", "build"]);

const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) throw new Error("Build standalone introuvable : vérifie output: 'standalone' dans next.config.ts");

rmSync(stage, { recursive: true, force: true });
mkdirSync(path.join(stage, "app"), { recursive: true });
const MAX_ARCHIVE_MB = 200; // un paquet normal fait environ 25 Mo

console.log("→ Assemblage…");
cpSync(standalone, path.join(stage, "app"), { recursive: true });
// Garde-fou : le traçage de Next peut recopier dist/ (les anciens paquets) dans le build autonome, et la taille double alors à chaque version.
for (const junk of ["dist", ".claude", "data", ".git"]) rmSync(path.join(stage, "app", junk), { recursive: true, force: true });
cpSync(path.join(root, ".next", "static"), path.join(stage, "app", ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(stage, "app", "public"), { recursive: true });
cpSync(path.join(root, "drizzle"), path.join(stage, "drizzle"), { recursive: true });
cpSync(path.join(root, "deploy"), path.join(stage, "deploy"), { recursive: true });
cpSync(path.join(root, "deploy", "migrate"), path.join(stage, "migrate"), { recursive: true });

// Garde-fou : des fichiers internes de Next doivent être présents, sinon TOUTES les routes qui lisent la session plantent en production
// (erreur « cookies was called outside a request scope » : téléchargements, images, API). Cela est arrivé avec outputFileTracingExcludes.
const appRender = path.join(stage, "app", "node_modules", "next", "dist", "server", "app-render");
for (const needed of ["work-unit-async-storage.external.js", "work-async-storage.external.js"]) {
  if (!existsSync(path.join(appRender, needed))) {
    throw new Error(`Fichier interne de Next manquant dans le paquet : ${needed}. Ne PAS utiliser outputFileTracingExcludes avec un motif « dist » : il exclut aussi node_modules/next/dist.`);
  }
}

// Binaires sharp propres à Windows/x64, inutiles sur le Pi (images non optimisées). NE PAS retirer @swc : Next en a besoin (@swc/helpers).
for (const dir of ["@img", "sharp"]) rmSync(path.join(stage, "app", "node_modules", dir), { recursive: true, force: true });

// Garde-fou : jamais de secrets ni de données dans l'archive.
const forbidden = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (/^\.env(\.|$)/.test(e.name) && e.name !== ".env.example") forbidden.push(p);
    if (e.isDirectory()) walk(p);
  }
};
walk(stage);
if (forbidden.length) throw new Error(`Fichiers sensibles dans l'archive : ${forbidden.join(", ")}`);

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const archive = path.join(out, `backstage-${stamp}.tar.gz`);
console.log("→ Archive…");
// Chemins relatifs + cwd : GNU tar (Git Bash) prend « C:\… » pour un hôte distant.
run("tar", ["-czf", path.basename(archive), "backstage"], { cwd: out });
const sizeMb = statSync(archive).size / 1048576;
if (sizeMb > MAX_ARCHIVE_MB) throw new Error(`Archive anormalement grosse (${Math.round(sizeMb)} Mo, attendu ~25 Mo) : le build autonome contient sans doute des fichiers en trop. Vérifie « Dynamic filesystem access » dans les avertissements de la compilation.`);
// On ne garde que les 2 derniers paquets (les plus anciens ne servent à rien).
const all = readdirSync(out).filter((f) => /^backstage-\d+\.tar\.gz$/.test(f)).sort();
for (const old of all.slice(0, -2)) rmSync(path.join(out, old), { force: true });
writeFileSync(path.join(out, "LATEST"), path.basename(archive));
console.log(`  Taille : ${sizeMb.toFixed(1)} Mo`);
console.log(`\n✓ ${archive}\n  Envoi sur le Pi :  scp "${archive}" pi@raspberrypi.local:\n  Puis sur le Pi  :  sudo /opt/backstage/install.sh ~/${path.basename(archive)}`);
