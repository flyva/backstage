import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import("./index");
  const { faqItems, usefulLinks, resourceLinks, altCompanies, companyStatuses } = await import("./schema");
  const { count, eq } = await import("drizzle-orm");
  const { companyKey, parseTypes } = await import("../lib/company-search");

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

  const [{ n: statusCount }] = await db.select({ n: count() }).from(companyStatuses);
  if (statusCount === 0) {
    await db.insert(companyStatuses).values([
      { key: "a_contacter", label: "À contacter", color: "zinc", position: 0 },
      { key: "cv_envoye", label: "CV envoyé", color: "sky", position: 1 },
      { key: "relance", label: "Relancé", color: "sky", position: 2 },
      { key: "rappeler", label: "À rappeler", color: "amber", position: 3 },
      { key: "entretien_prevu", label: "Entretien prévu", color: "violet", position: 4 },
      { key: "en_cours", label: "En cours", color: "blue", position: 5 },
      { key: "valider", label: "Validé", color: "emerald", position: 6 },
      { key: "refuser", label: "Refusé", color: "rose", position: 7 },
      { key: "refuse_apres_entretien", label: "Refusé après entretien", color: "rose", position: 8 },
      { key: "annuler", label: "Annulé", color: "zinc", position: 9 },
    ]);
  }

  // ---------- Recherche d'alternance (repris du Notion « 3IS - Aide à la recherche d'alternance ») ----------

  const [{ n: altFaqCount }] = await db.select({ n: count() }).from(faqItems).where(eq(faqItems.category, "Recherche d'alternance"));
  if (altFaqCount === 0) {
    await db.insert(faqItems).values([
      { category: "Recherche d'alternance", question: "Qu'est-ce que l'alternance ?", answer: "L'alternance est un mode de formation qui permet d'alterner entre des périodes en entreprise et des périodes en établissement de formation. Elle permet d'acquérir à la fois des compétences théoriques et une expérience professionnelle. Tu apprends, tu pratiques et tu es payé !" },
      { category: "Recherche d'alternance", question: "Qu'est-ce qu'un OPCO ?", answer: "Un opérateur de compétences est un organisme français agréé par l'État chargé d'accompagner la formation professionnelle des salariés. Les OPCO valident et financent une majorité des frais de scolarité." },
      { category: "Recherche d'alternance", question: "Que dois-je faire si je trouve une entreprise ?", answer: "Il faut prendre contact au plus vite avec ta chargée des Relations Entreprises : fais un mail avec les informations de l'entreprise (Nom Prénom du contact, Nom de l'entreprise, Téléphone, Email)." },
      { category: "Recherche d'alternance", question: "Quels sont les avantages de l'alternance ?", answer: "Une formation gratuite et rémunérée. Une immersion dans le monde du travail. Une meilleure employabilité après les études. L'acquisition d'une expérience professionnelle significative." },
      { category: "Recherche d'alternance", question: "Quel est le salaire en alternance ?", answer: "Il dépend de ton âge et de ton niveau d'études, mais tu es toujours rémunéré — entre 27 % et 100 % du SMIC selon ton profil." },
      { category: "Recherche d'alternance", question: "Combien de temps dure un contrat en alternance ?", answer: "La durée varie en fonction du diplôme. Pour qu'un contrat soit valable il est nécessaire que le contrat couvre la formation jusqu'à l'obtention du diplôme." },
      { category: "Recherche d'alternance", question: "Qui finance la formation en alternance ?", answer: "C'est l'OPCO de l'entreprise qui prend en charge tout ou partie du coût, ce qui signifie qu'elle est gratuite pour l'alternant." },
      { category: "Recherche d'alternance", question: "Mon entreprise me demande combien coûte la formation ?", answer: "Le tarif de formation dépend du niveau de prise en charge de l'OPCO par l'entreprise (cela dépend d'une formation et d'une convention collective). Il est important de ne pas communiquer de tarif à l'entreprise : prends contact au plus vite avec ta chargée des Relations Entreprises afin qu'elle transmette un devis à l'entreprise." },
      { category: "Recherche d'alternance", question: "Puis-je rompre un contrat d'alternance ?", answer: "Oui, mais sous certaines conditions. La rupture peut être à l'initiative de l'alternant, de l'entreprise ou d'un commun accord. Des règles spécifiques s'appliquent en fonction du type de contrat." },
      { category: "Recherche d'alternance", question: "Suis-je un salarié ou un étudiant en alternance ?", answer: "En alternance, tu es à la fois salarié de ton entreprise et étudiant de ton centre de formation. Tu as donc des droits et devoirs liés aux deux statuts." },
      { category: "Recherche d'alternance", question: "Puis-je bénéficier d'aides financières en tant qu'alternant ?", answer: "Oui, plusieurs aides existent : aide au financement du permis de conduire, aide Mobili-Jeune pour le logement, prime d'activité selon les revenus, APL (aide personnalisée au logement)." },
      { category: "Recherche d'alternance", question: "Puis-je poursuivre mes études après une alternance ?", answer: "Oui, l'alternance n'empêche pas de poursuivre des études supérieures, y compris en formation initiale ou en alternance." },
    ]);
  }

  const [{ n: outilsCount }] = await db.select({ n: count() }).from(resourceLinks).where(eq(resourceLinks.category, "outils"));
  if (outilsCount === 0) {
    await db.insert(resourceLinks).values([
      { category: "outils", label: "Hunter", url: "https://hunter.io/search", description: "Pour vous aider à trouver le bon e-mail" },
      { category: "outils", label: "Mailtrack", url: "https://mailsuite.com/en/", description: "Pour vous aider à tracker vos mails" },
      { category: "outils", label: "Monday", url: "https://monday.com/lang/fr/", description: "Pour organiser et suivre tes candidatures" },
      { category: "outils", label: "CVDesignR", url: "https://cvdesignr.com/fr", description: "Pour créer ton CV professionnel" },
    ]);
  }

  const [{ n: ressourcesCount }] = await db.select({ n: count() }).from(resourceLinks).where(eq(resourceLinks.category, "sites_ressources"));
  if (ressourcesCount === 0) {
    await db.insert(resourceLinks).values([
      { category: "sites_ressources", label: "ALCA Nouvelle-Aquitaine", url: "https://alca-nouvelle-aquitaine.fr/fr/annuaire-des-professionnels", description: "Annuaire des professionnels du cinéma en Nouvelle-Aquitaine" },
      { category: "sites_ressources", label: "RIM", url: "https://api.le-rim.org/adherents/liste", description: "L'annuaire des adhérents du RIM" },
      { category: "sites_ressources", label: "SMAC — Ministère de la Culture", url: "https://www.culture.gouv.fr/thematiques/musique/spectacle-vivant-musical/musiques-actuelles/scene-de-musiques-actuelles-smac", description: "Scènes de musiques actuelles" },
      { category: "sites_ressources", label: "Sma", url: "https://www.sma-syndicat.org/annuaire-des-adherents/", description: "Annuaire des adhérents du syndicat des musiques actuelles" },
      { category: "sites_ressources", label: "Film France", url: "https://www.filmfrance.net/", description: "Page d'accueil Film France (CNC)" },
      { category: "sites_ressources", label: "CNC", url: "https://www.cnc.fr/", description: "Soutien à la création cinéma, séries, TV, jeu vidéo" },
      { category: "sites_ressources", label: "UPC", url: "https://www.producteurscinema.fr/", description: "Union de producteurs de cinéma" },
      { category: "sites_ressources", label: "AFC", url: "https://www.afcinema.com/", description: "Association française des directeurs de la photographie cinématographique" },
    ]);
  }

  const [{ n: jobboardsCount }] = await db.select({ n: count() }).from(resourceLinks).where(eq(resourceLinks.category, "jobboards"));
  if (jobboardsCount === 0) {
    await db.insert(resourceLinks).values([
      { category: "jobboards", label: "Glassdoor", url: "https://www.glassdoor.fr/", description: "" },
      { category: "jobboards", label: "La bonne alternance", url: "https://labonnealternance.apprentissage.beta.gouv.fr/", description: "" },
      { category: "jobboards", label: "Welcome to the Jungle", url: "https://www.welcometothejungle.com/fr", description: "" },
      { category: "jobboards", label: "HelloWork", url: "https://www.hellowork.com/fr-fr/", description: "" },
      { category: "jobboards", label: "La bonne boîte", url: "https://labonneboite.francetravail.fr/", description: "" },
      { category: "jobboards", label: "Job Culture", url: "https://www.jobculture.fr/", description: "" },
      { category: "jobboards", label: "LinkedIn", url: "https://www.linkedin.com/jobs/", description: "" },
      { category: "jobboards", label: "MediaJobs", url: "https://www.mediajobs.fr/", description: "" },
    ]);
  }

  const [{ n: carrieresCount }] = await db.select({ n: count() }).from(resourceLinks).where(eq(resourceLinks.category, "sites_carrieres"));
  if (carrieresCount === 0) {
    await db.insert(resourceLinks).values([
      { category: "sites_carrieres", label: "Groupe M6", url: "https://www.groupem6.fr/offres/", description: "Offres d'emploi et recrutement" },
      { category: "sites_carrieres", label: "Groupe TF1", url: "https://carrieres.groupe-tf1.fr/TalentDating", description: "TF1 Talent Dating" },
      { category: "sites_carrieres", label: "Groupe France TV", url: "https://recrutement.francetelevisions.fr/go/Nos-offres-d%27emploi/8993455/", description: "" },
      { category: "sites_carrieres", label: "France Médias Monde", url: "https://recrutement.francemm.com/nous-rejoindre/", description: "" },
      { category: "sites_carrieres", label: "Groupe NRJ", url: "https://carrieres.nrj.fr/emplois/", description: "" },
      { category: "sites_carrieres", label: "Radio France", url: "https://radiofrance-recrute.talent-soft.com/offre-de-emploi/liste-toutes-offres.aspx?all=1&mode=list", description: "" },
      { category: "sites_carrieres", label: "Groupe Canal+", url: "https://jobs.canalplus.com/articles/fr/nos-histoires/stages-et-alternances", description: "" },
      { category: "sites_carrieres", label: "Arte", url: "https://emploi.artefrance.fr/", description: "Liste des offres" },
      { category: "sites_carrieres", label: "Netflix France", url: "https://jobs.netflix.com/locations/paris", description: "Work in Paris" },
      { category: "sites_carrieres", label: "Mediawan", url: "https://career.mediawan.com/fr/annonces", description: "" },
      { category: "sites_carrieres", label: "Disney", url: "https://emplois.disneycareers.com/l%e2%80%99emploi-%c3%a0-disneyland-paris", description: "Disneyland Paris" },
      { category: "sites_carrieres", label: "Cultura", url: "https://www.cultura.com/espace-candidat", description: "" },
      { category: "sites_carrieres", label: "Decathlon", url: "https://joinus.decathlon.fr/fr/annonces", description: "" },
      { category: "sites_carrieres", label: "Groupe BPCE", url: "https://recrutement.bpce.fr/offres-emploi?tax_contract=contrat-dapprentissage,contrat-en-alternance", description: "" },
      { category: "sites_carrieres", label: "FLOA", url: "https://careers.floa.com/jobs", description: "" },
      { category: "sites_carrieres", label: "Macif", url: "https://www.macif.fr/assurance/la-macif/ressources-humaines/catalogue-des-offres", description: "" },
      { category: "sites_carrieres", label: "Maif", url: "https://recrutement.maif.fr/offre-de-emploi/liste-offres.aspx", description: "" },
      { category: "sites_carrieres", label: "SNCF", url: "https://emploi.sncf.com/nos-offres", description: "" },
      { category: "sites_carrieres", label: "Enedis", url: "https://www.enedis.fr/emploi", description: "" },
    ]);
  }

  // Listing entreprises (Nouvelle-Aquitaine), repris du Notion : rejoint l'annuaire partagé de Recherche entreprises
  // (jamais le tableau de personne en particulier, chacun l'ajoutera au sien s'il le souhaite).
  const listing: { name: string; sector: string; city: string; notes: string }[] = [
    { name: "Sonolight Concept", sector: "Son / Lumière / Vidéo", city: "Bordeaux", notes: "Corporate & live" },
    { name: "Prestacom", sector: "Audiovisuel / Event", city: "Bordeaux", notes: "Régie vidéo" },
    { name: "GL events Audiovisual", sector: "Audiovisuel / Event", city: "Bordeaux", notes: "Grands formats" },
    { name: "Novelty Aquitaine", sector: "Son / Lumière / Vidéo", city: "Bordeaux", notes: "Groupe national" },
    { name: "Magnum Live", sector: "Son / Lumière", city: "Sud-Ouest", notes: "Concerts & tournées" },
    { name: "Dushow Sud-Ouest", sector: "Son / Lumière / Vidéo", city: "Nouvelle-Aquitaine", notes: "Spectacle vivant" },
    { name: "S Group", sector: "Technique événementielle", city: "Bordeaux", notes: "Événementiel premium" },
    { name: "EBS Audio", sector: "Son", city: "Gironde", notes: "Spécialiste audio" },
    { name: "Impact Événement", sector: "Son / Lumière / Vidéo", city: "Nouvelle-Aquitaine", notes: "Corporate" },
    { name: "Sud Sono", sector: "Son / Lumière", city: "Sud-Ouest", notes: "Prestataire régional" },
    { name: "Scène de Nuit", sector: "Son / Lumière", city: "Nouvelle-Aquitaine", notes: "Spectacle & festivals" },
    { name: "Arkéa Arena", sector: "Régie générale", city: "Floirac", notes: "Très grande jauge" },
    { name: "Rocher de Palmer", sector: "Régie polyvalente", city: "Cenon", notes: "SMAC" },
    { name: "Le Krakatoa", sector: "Son / Lumière / Plateau", city: "Mérignac", notes: "SMAC" },
    { name: "Rock School Barbey", sector: "Régie live", city: "Bordeaux", notes: "SMAC" },
    { name: "Théâtre Femina", sector: "Régie spectacle", city: "Bordeaux", notes: "Salle privée" },
    { name: "TNBA", sector: "Régie théâtre", city: "Bordeaux", notes: "Centre dramatique" },
    { name: "Opéra National de Bordeaux", sector: "Régie plateau", city: "Bordeaux", notes: "Institution" },
    { name: "Le Pin Galant", sector: "Régie spectacle", city: "Mérignac", notes: "Théâtre" },
    { name: "La Sirène", sector: "Régie spectacle", city: "La Rochelle", notes: "SMAC" },
    { name: "Zénith de Limoges", sector: "Régie spectacle", city: "Limoges", notes: "Grande salle" },
    { name: "Zénith de Pau", sector: "Régie spectacle", city: "Pau", notes: "Grande salle" },
    { name: "TAP Poitiers", sector: "Régie spectacle", city: "Poitiers", notes: "Scène nationale" },
    { name: "L'Agora Boulazac", sector: "Régie spectacle", city: "Dordogne", notes: "Scène nationale" },
    { name: "Carré-Colonnes", sector: "Régie polyvalente", city: "Métropole BX", notes: "Théâtre" },
    { name: "Moulin du Roc", sector: "Régie spectacle", city: "Niort", notes: "Scène nationale" },
    { name: "Atelier Cambium", sector: "Production événementielle", city: "Bordeaux", notes: "Corporate" },
    { name: "Tête à Tête Event", sector: "Événementiel", city: "Bordeaux", notes: "Coordination" },
    { name: "Côte Ouest Événement", sector: "Événementiel", city: "Bordeaux", notes: "Corporate" },
    { name: "Native Events", sector: "Événementiel", city: "Bordeaux", notes: "Agence locale" },
    { name: "Burdigala Events", sector: "Événementiel", city: "Bordeaux", notes: "Production" },
    { name: "Hémisphère Sud", sector: "Scénographie / Event", city: "Nouvelle-Aquitaine", notes: "Événements d'envergure" },
    { name: "Anagram", sector: "Production événementielle", city: "Nouvelle-Aquitaine", notes: "Groupe national" },
    { name: "Auditoire Sud-Ouest", sector: "Event / Production", city: "Sud-Ouest", notes: "Grands comptes" },
    { name: "Publicis Live Bordeaux", sector: "Event", city: "Bordeaux", notes: "Événementiel premium" },
    { name: "Magic Garden", sector: "Event / Brand experience", city: "Bordeaux", notes: "Expérientiel" },
    { name: "Passage Production", sector: "Production événementielle", city: "Nouvelle-Aquitaine", notes: "Spectacle & event" },
    { name: "Mina Prod", sector: "Régie audiovisuelle", city: "Bordeaux", notes: "Production" },
    { name: "Les Films de l'Arsenal", sector: "Régie plateau", city: "Bordeaux", notes: "Cinéma" },
    { name: "La Maison du Live", sector: "Régie live / streaming", city: "Bordeaux", notes: "Captation live" },
    { name: "Label Son & Image", sector: "Audiovisuel", city: "Bordeaux", notes: "Tournage & post-prod" },
    { name: "B Production", sector: "Audiovisuel", city: "Bordeaux", notes: "Vidéo corporate" },
    { name: "Grand Angle Prod", sector: "Audiovisuel", city: "Nouvelle-Aquitaine", notes: "Documentaire" },
    { name: "Kanaldude", sector: "Audiovisuel", city: "Pays basque", notes: "TV & prod" },
    { name: "Eclair NA", sector: "Technique cinéma", city: "Nouvelle-Aquitaine", notes: "Prestations cinéma" },
    { name: "TV7 Bordeaux", sector: "Régie TV", city: "Bordeaux", notes: "Chaîne locale" },
    { name: "Ville de Bordeaux", sector: "Régie événementielle", city: "Bordeaux", notes: "Services techniques" },
    { name: "Bordeaux Métropole", sector: "Technique événementielle", city: "Bordeaux", notes: "Institution" },
    { name: "Palais des Congrès", sector: "Audiovisuel / Event", city: "Bordeaux", notes: "Équipements intégrés" },
    { name: "Parc Expo Bordeaux", sector: "Régie générale", city: "Bordeaux", notes: "Grands événements" },
    { name: "Université de Bordeaux", sector: "Audiovisuel / Event", city: "Bordeaux", notes: "Service interne" },
    { name: "Région Nouvelle-Aquitaine", sector: "Culture / Event", city: "Nouvelle-Aquitaine", notes: "Institution régionale" },
    { name: "Ville de La Rochelle", sector: "Régie événementielle", city: "La Rochelle", notes: "Institution" },
    { name: "Département de la Gironde", sector: "Événementiel", city: "Gironde", notes: "Institution" },
    { name: "Cité du Vin", sector: "Audiovisuel / Event", city: "Bordeaux", notes: "Lieu culturel équipé" },
    { name: "Cap Sciences", sector: "Audiovisuel / Event", city: "Bordeaux", notes: "Expos & événements" },
    { name: "Bordeaux Open Air", sector: "Technique événementielle", city: "Bordeaux", notes: "Festival estival" },
    { name: "Festival ODP", sector: "Régie événementielle", city: "Talence", notes: "Festival" },
    { name: "Relâche", sector: "Technique spectacle", city: "Bordeaux", notes: "Arts de la rue" },
    { name: "Francofolies", sector: "Régie spectacle", city: "La Rochelle", notes: "Festival majeur" },
    { name: "Musicalarue", sector: "Régie festival", city: "Luxey", notes: "Festival" },
    { name: "FIFIB", sector: "Technique événementielle", city: "Bordeaux", notes: "Cinéma" },
    { name: "Garorock", sector: "Régie festival", city: "Marmande", notes: "Très grande jauge" },
    { name: "SunSka Festival", sector: "Régie festival", city: "Gironde", notes: "Musiques actuelles" },
    { name: "Ecaussystème", sector: "Régie festival", city: "Lot", notes: "Festival engagé" },
    { name: "Festival International du Film de La Rochelle", sector: "Technique cinéma", city: "La Rochelle", notes: "Cinéma" },
  ];
  for (const c of listing) {
    const nameKey = companyKey(c.name, c.city);
    const [existing] = await db.select({ id: altCompanies.id }).from(altCompanies).where(eq(altCompanies.nameKey, nameKey)).limit(1);
    if (!existing) await db.insert(altCompanies).values({ name: c.name, nameKey, city: c.city, sector: c.sector, types: parseTypes(c.sector), perks: c.notes });
  }

  console.log("Seed OK");
  process.exit(0);
}
main();
