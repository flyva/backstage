import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("./index");
  const { faqItems, usefulLinks } = await import("./schema");
  const { count } = await import("drizzle-orm");

  const [{ n: faqCount }] = await db.select({ n: count() }).from(faqItems);
  if (faqCount === 0) {
    await db.insert(faqItems).values([
      { category: "Backstage", question: "À quoi sert Backstage ?", answer: "C'est le hub de la promo : école, planning, transports, ressources et projets au même endroit." },
      { category: "Backstage", question: "Comment ajouter mon planning Ypareo ?", answer: "Dans Ypareo : Planning → Action → Export au format iCalendar. Copie ensuite le lien dans ton profil." },
      { category: "École", question: "Comment me connecter au Wi-Fi ?", answer: "Va dans École et scanne le QR code, ou copie le mot de passe." },
    ]);
  }
  const [{ n: linkCount }] = await db.select({ n: count() }).from(usefulLinks);
  if (linkCount === 0) {
    await db.insert(usefulLinks).values([
      { category: "Transports", label: "TBM", url: "https://www.infotbm.com", description: "Horaires et perturbations bus, tram, bateau" },
      { category: "Transports", label: "V³ (vélos en libre-service)", url: "https://www.infotbm.com/fr/velo-en-libre-service", description: "Stations et disponibilités" },
    ]);
  }
  console.log("Seed OK");
  process.exit(0);
}
main();
