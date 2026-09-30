// Compile, envoie et installe Backstage sur le Raspberry Pi en une commande :
//   npm run deploy                (compile + envoie + installe)
//   npm run deploy -- --skip-build   (réutilise la dernière archive de dist/)
// Cible : variable DEPLOY_HOST ou fichier .deploy (une ligne « utilisateur@adresse », ignoré par git).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });

const hostFile = path.join(root, ".deploy");
const host = (process.env.DEPLOY_HOST || (existsSync(hostFile) ? readFileSync(hostFile, "utf8") : "")).trim();
if (!/^[\w.-]+@[\w.-]+$/.test(host)) {
  console.error("Cible introuvable : crée le fichier .deploy avec une ligne « utilisateur@adresse-du-pi » (ou définis DEPLOY_HOST).");
  process.exit(1);
}

if (!process.argv.includes("--skip-build")) run("npm", ["run", "package"]);

const dist = path.join(root, "dist");
const archives = existsSync(dist) ? readdirSync(dist).filter((f) => /^backstage-\d+\.tar\.gz$/.test(f)) : [];
if (archives.length === 0) { console.error("Aucune archive dans dist/ : lance d'abord npm run package."); process.exit(1); }
archives.sort((a, b) => statSync(path.join(dist, b)).mtimeMs - statSync(path.join(dist, a)).mtimeMs);
const archive = archives[0];
console.log(`→ Envoi de ${archive} vers ${host}`);
run("scp", [path.join(dist, archive), path.join(root, "deploy", "install.sh"), path.join(root, "deploy", "backup.sh"), `${host}:`], { shell: false }); // dossier personnel (carte SD) : /tmp du Pi est en mémoire et se remplit vite

console.log("→ Installation sur le Pi (le mot de passe sudo peut être demandé)");
// shell:false : sinon cmd.exe coupe la commande distante aux « && » et la lance sur le PC. -t : terminal interactif pour que sudo puisse demander le mot de passe.
run("ssh", ["-t", host, `sudo install -m 755 ~/install.sh ~/backup.sh /opt/backstage/ && sudo /opt/backstage/install.sh ~/${archive} && rm -f ~/${archive} ~/install.sh ~/backup.sh`], { shell: false });
console.log("✓ Déploiement terminé");
