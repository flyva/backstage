// Construit l'archive de déploiement : dist/backstage-<date>.tar.gz
//   npm run package
// À lancer sur le PC (jamais sur le Pi : trop peu de RAM pour compiler Next.js).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

console.log("→ Assemblage…");
cpSync(standalone, path.join(stage, "app"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(stage, "app", ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(stage, "app", "public"), { recursive: true });
cpSync(path.join(root, "drizzle"), path.join(stage, "drizzle"), { recursive: true });
cpSync(path.join(root, "deploy"), path.join(stage, "deploy"), { recursive: true });
cpSync(path.join(root, "deploy", "migrate"), path.join(stage, "migrate"), { recursive: true });

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
writeFileSync(path.join(out, "LATEST"), path.basename(archive));
console.log(`\n✓ ${archive}\n  Envoi sur le Pi :  scp "${archive}" pi@raspberrypi.local:/tmp/\n  Puis sur le Pi  :  sudo /opt/backstage/install.sh /tmp/${path.basename(archive)}`);
