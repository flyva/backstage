// Données du « Guide de rentrée 2026-2027 » de 3iS Bordeaux, reprises telles quelles du PDF de l'école.
// Sert à remplir Backstage (annuaire, FAQ, liens, wiki, réglages) et à nourrir l'assistant.

export type GuideContact = { group: string; name: string; role: string; email?: string; phone?: string; note?: string };

export const GUIDE_CONTACTS: GuideContact[] = [
  // Services (adresses génériques)
  { group: "Services de l'école", name: "Vie scolaire", role: "Absences, retards, justificatifs, réservation de salle", email: "viescolaire.bordeaux@3is.fr", phone: "05 56 51 90 30" },
  { group: "Services de l'école", name: "Support informatique", role: "Accès aux outils, panne de matériel, connexion", email: "support@3is.fr" },
  { group: "Services de l'école", name: "Magasin", role: "Emprunt de matériel", email: "magasin_bx@3is.fr" },
  { group: "Services de l'école", name: "BDE Bordeaux", role: "Bureau des élèves : évènements toute l'année", email: "bdebordeaux@3is.fr" },
  { group: "Services de l'école", name: "Service Communication", role: "Clubs étudiants", email: "communication.bdx@3is.fr" },
  { group: "Services de l'école", name: "Service International", role: "Mobilité, Erasmus+", email: "erasmus@3is.fr" },
  // Direction
  { group: "Direction", name: "Géraldine RABIER", role: "Directrice générale du campus de Bordeaux", email: "grabier@3is.fr" },
  { group: "Direction", name: "Stéphane LAMY", role: "Directeur général adjoint", email: "slamy@3is.fr" },
  { group: "Direction", name: "Sylvie MOLINES BRISSOT", role: "Assistante de direction ; référente RSE", email: "smolinesbrissot@3is.fr" },
  // Coordination pédagogique
  { group: "Coordination pédagogique", name: "Marcia DESPORT", role: "Responsable de la coordination pédagogique ; référente VHSS", email: "mdesport@3is.fr" },
  { group: "Coordination pédagogique", name: "Emma DAMÊME", role: "Coordinatrice pédagogique adjointe", email: "edameme@3is.fr" },
  { group: "Coordination pédagogique", name: "Isabelle DESSOLAS", role: "Assistante pédagogique, chargée d'accueil", email: "idessolas@3is.fr" },
  { group: "Coordination pédagogique", name: "Jocelyn LESNÉ", role: "Assistant pédagogique, chargé d'accueil ; référent mobilité internationale", email: "jlesne@3is.fr" },
  // Relations entreprises
  { group: "Relations entreprises", name: "Laurent CARRÉ", role: "Responsable développement commercial", email: "lcarre@3is.fr" },
  { group: "Relations entreprises", name: "Amélie LAVOLEE", role: "Chargée de relations entreprise (alternances)", email: "alavolee@3is.fr" },
  { group: "Relations entreprises", name: "Amélie TAUZIEDE", role: "Assistante relations entreprise (stages)", email: "atauziede@3is.fr" },
  // Admissions
  { group: "Admissions", name: "Laura MAMES", role: "Chargée de promotion et admission ; référente égalité et diversité", email: "lmames@3is.fr" },
  { group: "Admissions", name: "Clara DE LOS ANGELES", role: "Chargée de promotion et admission", email: "cdelosangeles@3is.fr" },
  { group: "Admissions", name: "Alexandra DELHORBE", role: "Chargée de promotion et admission", email: "adelhorbe@3is.fr" },
  // Communication
  { group: "Communication", name: "Emma BALETTINI", role: "Chargée de communication", email: "ebalettini@3is.fr" },
  { group: "Communication", name: "Charlotte DUCONSEIL", role: "Apprentie communication", email: "cduconseil@3is.fr" },
  // Magasin
  { group: "Magasin", name: "Olivier SCHUSTER", role: "Responsable magasin", email: "magasin_bx@3is.fr" },
  { group: "Magasin", name: "Léo NAILLOU", role: "Équipier magasin", email: "magasin_bx@3is.fr" },
  { group: "Magasin", name: "Paul DUPOUY", role: "Équipier magasin", email: "magasin_bx@3is.fr" },
  // Pôle technique
  { group: "Pôle technique", name: "Frédéric FOULQUIER", role: "Directeur technique", email: "ffoulquier@3is.fr" },
  { group: "Pôle technique", name: "Jean-Michel DE CATTERINA", role: "Technicien de maintenance ; référent égalité et diversité", email: "jmdecatterina@3is.fr" },
  { group: "Pôle technique", name: "Saïd LAAMRI", role: "Technicien informatique", email: "slaamri@3is.fr" },
  // Autres responsabilités
  { group: "Référents", name: "Sonia MANGIN", role: "Référente handicap", email: "smangin@3is.fr" },
  { group: "Référents", name: "Marcia DESPORT", role: "Référente VHSS (violences et harcèlements sexistes et sexuels)", email: "mdesport@3is.fr" },
  // Référents pédagogiques : spectacle, son, cinéma
  { group: "Référents pédagogiques", name: "Pierre TABEL", role: "Référent filière spectacle et évènementiel", email: "ptabel@3is.fr" },
  { group: "Référents pédagogiques", name: "Stéphanie FRIBOURG", role: "Référente filière Acting", email: "sfribourg@3is.fr" },
  { group: "Référents pédagogiques", name: "Lissa MERIDAN", role: "Responsable pédagogique Son", email: "lmeridan@3is.fr" },
  { group: "Référents pédagogiques", name: "Jonathan CHARLOT", role: "Référent Son 1re année", email: "jonathan.charlot@3is.fr" },
  { group: "Référents pédagogiques", name: "Jean-Philippe DUBROCA", role: "Référent spécialisation Musique", email: "jpdubroca@3is.fr" },
  { group: "Référents pédagogiques", name: "Sam WELCH", role: "Référent Sound Engineering 1st Year", email: "sam.welch@3is.fr" },
  { group: "Référents pédagogiques", name: "Camille MARCOS", role: "Référent spécialisation Son, Cinéma et Sound Design", email: "camille.marcos@3is.fr" },
  { group: "Référents pédagogiques", name: "Fara POHU", role: "Référente anglais", email: "fpohu@3is.fr", note: "Adresse recopiée d'après le guide, qui comporte une faute de frappe : à vérifier." },
  { group: "Référents pédagogiques", name: "Marc BARADAT", role: "Coordinateur pédagogique Cinéma et Audiovisuel ; référent spécialisation réalisation et fiction", email: "mbaradat@3is.fr" },
  { group: "Référents pédagogiques", name: "Lison LAGOARDE", role: "Référente prépa", email: "lison.lagoardesegot@3is.fr" },
  { group: "Référents pédagogiques", name: "Christophe LEYTON", role: "Référent 1re année Cinéma et Audiovisuel", email: "cleyton@3is.fr" },
  { group: "Référents pédagogiques", name: "Romain GENTIL", role: "Référent spécialisation image", email: "romain.gentil@3is.fr" },
  { group: "Référents pédagogiques", name: "Thomas ORSSAUD", role: "Référent spécialisation montage", email: "torssaud@3is.fr" },
  { group: "Référents pédagogiques", name: "Gilles PARMENTIER", role: "Référent spécialisation production", email: "gilles.parmentier@3is.fr" },
  { group: "Référents pédagogiques", name: "Jean-Baptiste BEIS", role: "Référent spécialisation réalisation audiovisuelle", email: "jeanbaptiste.beis@3is.fr" },
  // Aide extérieure
  { group: "Écoute et soutien", name: "Nightline", role: "Écoute gratuite, anonyme et confidentielle par des étudiants formés, tous les soirs de 21 h à 2 h 30 (téléphone ou tchat)", phone: "05 82 95 10 11" },
];

export type GuideFaq = { category: string; question: string; answer: string };

export const GUIDE_FAQ: GuideFaq[] = [
  { category: "Vie de l'école", question: "Aurai-je une carte étudiante ?", answer: "Oui : en tant qu'étudiant du supérieur, tu auras une carte étudiante, utile toute l'année (réductions et avantages). Elle n'est remise que lorsque ton dossier est complet : contrat d'inscription, chèque de caution, photo, CVEC, assurance responsabilité civile…" },
  { category: "Vie de l'école", question: "Existe-t-il une association des étudiants ?", answer: "Oui, le **Bureau des élèves (BDE)** de 3iS Bordeaux organise des évènements toute l'année. Contact : **bdebordeaux@3is.fr**." },
  { category: "Vie de l'école", question: "Je suis complètement perdu, à qui m'adresser ?", answer: "Rends-toi directement à **l'accueil** : il pourra t'orienter." },
  { category: "Vie de l'école", question: "Existe-t-il des clubs étudiants ?", answer: "Oui : Club Ciné, Club Photo, Club Musique, Club Doublage, Club Échecs et Club Apiculteur. Renseigne-toi auprès du service Communication : **communication.bdx@3is.fr**." },
  { category: "Vie de l'école", question: "Vais-je travailler avec les étudiants des autres filières ?", answer: "Oui. Selon les projets, tu collabores avec des étudiants d'autres spécialisations, comme dans le monde professionnel." },
  { category: "Vie de l'école", question: "Quels sont les horaires d'ouverture du campus ?", answer: "L'école est ouverte de **8h30 à 19h** en semaine. Le bâtiment 10 Dubuffet ferme à **18h30**. Les cours ont lieu du lundi au vendredi et certains samedis." },
  { category: "Vie de l'école", question: "Où est l'école ?", answer: "**36 rue des Terres Neuves (BT 36 Reinhardt), 33130 Bègles** (adresse principale) et **10 rue des Terres Neuves (BT 10 Dubuffet), 33130 Bègles**." },
  { category: "Cours et assiduité", question: "Que faire en cas d'absence ou de retard ?", answer: "Préviens la **vie scolaire** (viescolaire.bordeaux@3is.fr, 05 56 51 90 30) et transmets les justificatifs demandés **sous 48 h**. Les absences et retards non justifiés sont comptabilisés : après **10 h** d'absences injustifiées cumulées, premier avertissement ; après **30 h**, second avertissement et convocation à un entretien disciplinaire avec le directeur des études." },
  { category: "Cours et assiduité", question: "Existe-t-il un congé menstruel ?", answer: "Oui : les étudiantes peuvent bénéficier d'un congé menstruel **jusqu'à 15 jours par année scolaire**. Un certificat médical mentionnant l'année scolaire en cours doit être transmis lors de la première demande." },
  { category: "Cours et assiduité", question: "Où trouver le règlement intérieur ?", answer: "Sur ton espace **My 3iS** : « Règlement Intérieur 3iS ». Tu t'es engagé à le respecter en le signant." },
  { category: "Cours et assiduité", question: "J'ai un problème de santé ou personnel qui complique mes études, que faire ?", answer: "N'attends pas que la situation se complique : contacte la **vie scolaire**, qui peut t'informer des dispositifs d'accompagnement et des aménagements possibles." },
  { category: "Cours et assiduité", question: "Comment réserver une salle ?", answer: "Salles de cours, salles informatiques, cabines de montage et de son, plateaux de tournage (sous réserve de disponibilité, priorité aux cours) : va **à l'accueil** ou écris à **viescolaire.bordeaux@3is.fr** en précisant le type de salle, la date et la durée. Pour les premières utilisations des espaces techniques, l'accord de tes professeurs référents est indispensable. Si tu n'utilises finalement pas la salle, préviens l'administration." },
  { category: "Matériel", question: "Comment emprunter du matériel à l'école ?", answer: "Écris **au moins deux semaines avant** au magasin (**magasin_bx@3is.fr**) et au référent de ta filière : date d'emprunt, référence du matériel, explication de ton projet. Le matériel est remis avec l'accord du référent et du magasin, sur présentation de la carte étudiante. C'est possible le week-end, mais le matériel est **prioritaire pour les cours**. Caution : **500 €** pour les cours et projets de l'école, **1 000 €** pour les projets personnels (rendue après vérification du bon état)." },
  { category: "Matériel", question: "Quel équipement est obligatoire en régie technique ?", answer: "Les équipements de protection individuelle sont **obligatoires** pour la régie technique et technicien du spectacle : chaussures de sécurité, gants de protection, casque de sécurité. Une lampe frontale est recommandée. Certains enseignants peuvent compléter la liste à la rentrée." },
  { category: "Aide et contacts", question: "Qui contacter pour un souci informatique à l'école ?", answer: "Envoie un mail à **support@3is.fr** (accès aux outils, panne de matériel, souci de connexion…)." },
  { category: "Aide et contacts", question: "Comment avoir des conseils pour un stage ou une alternance ?", answer: "Le bureau des **Relations Entreprise** t'accompagne : **atauziede@3is.fr** pour les stages, **alavolee@3is.fr** pour les alternances." },
  { category: "Aide et contacts", question: "Puis-je partir à l'étranger ?", answer: "Oui : mobilité académique, séjour linguistique ou stage à l'étranger, si ton projet est compatible avec ton planning pédagogique. Des aides existent (Erasmus+, Région Nouvelle-Aquitaine). Contacte le Référent Mobilité Internationale et le Service International : **erasmus@3is.fr**." },
  { category: "Aide et contacts", question: "J'ai besoin de l'ascenseur, à qui m'adresser ?", answer: "L'ascenseur est réservé en priorité aux personnes à mobilité réduite ou en situation de handicap, au transport de matériel lourd et aux salariés. Adresse-toi à **l'accueil** ou à la **Référente Handicap** (Sonia MANGIN, smangin@3is.fr)." },
  { category: "Aide et contacts", question: "Je suis blessé ou je ne me sens pas bien, que dois-je faire ?", answer: "Préviens ton référent ou intervenant et un camarade. À l'accueil, il y a une trousse à pharmacie, et une salle infirmerie dans chaque bâtiment. Des salariés sont présents à chaque étage, certains formés SST (sauveteur secouriste du travail)." },
  { category: "Aide et contacts", question: "Comment signaler un comportement inapproprié (harcèlement, violences sexistes ou sexuelles) ?", answer: "Toute personne concernée (victime ou témoin) peut signaler **par e-mail ou par téléphone** auprès de la référente VHSS (**Marcia DESPORT**, mdesport@3is.fr) ou de toute personne de confiance de l'équipe permanente. Avec ton accord, le signalement est transmis à la Direction ; les personnes qui signalent sont protégées (confidentialité, pas de représailles) et un accompagnement est proposé. 3iS est partenaire MeToo Media depuis 2026." },
  { category: "Aide et contacts", question: "Où trouver de l'écoute ou un soutien psychologique ?", answer: "**Mon soutien psy** : jusqu'à 12 séances par an avec un psychologue conventionné, sans passer par un médecin, prises en charge par l'Assurance Maladie. **Nightline** : écoute gratuite, anonyme et confidentielle par des étudiants formés, tous les soirs de 21 h à 2 h 30, au **05 82 95 10 11** ou par tchat." },
  { category: "Venir à l'école", question: "Comment venir en tramway ?", answer: "**Ligne C ou ligne F**, direction Villenave Pyrénées ou Gare de Bègles, descendre à l'arrêt **« Terres Neuves »** ou **« La Belle Rose »**." },
  { category: "Venir à l'école", question: "Puis-je venir en voiture ?", answer: "Il y a des places dans le quartier, mais c'est une **zone bleue** : il faut un disque obligatoire, réglé sur ton heure d'arrivée et renouvelé toutes les deux heures. Détails sur le site de la mairie de Bègles." },
  { category: "Venir à l'école", question: "Puis-je venir en vélo ou en trottinette ?", answer: "Oui, des racks sont disponibles. Prends ton propre cadenas (les cadenas SRA sont conseillés contre le vol) et ne le laisse pas sur l'emplacement quand tu ne l'utilises pas." },
  { category: "Venir à l'école", question: "Y a-t-il un abonnement transports pour les étudiants ?", answer: "Oui : le **Pass Jeune TBM** (moins de 27 ans) donne un accès illimité au tram, aux bus, aux parcs-relais et aux abris vélos de tout le réseau, pour **21,40 € par mois**." },
  { category: "Numérique", question: "Comment me connecter au Wi-Fi de l'école ?", answer: "Réseau **3iS Etudiant**. Identifiant : **prenom.nom**. Mot de passe : celui de ton compte Office 3iS. Des affiches avec un QR code à flasher sont installées dans l'école." },
  { category: "Numérique", question: "À quoi servent Teams, Netypareo, Econventionbordeaux et My 3iS ?", answer: "**Teams** : canal de communication principal (groupes de classe, ressources, dépôt de documents). **Netypareo** : emploi du temps, assiduité et notes. **Econventionbordeaux** : éditer et signer les conventions de stage. **My 3iS** : plateforme qui regroupe tous les accès. Ton **webmail** prenom.nom@3is.fr est utilisé par l'école pour t'écrire et te donne accès gratuitement à la suite Microsoft Office. Les codes d'accès sont envoyés à la rentrée ; en cas de problème, contacte la vie scolaire." },
  { category: "Démarches", question: "Qu'est-ce que la CVEC et comment la régler ?", answer: "La **Contribution à la vie étudiante et de campus** est obligatoire (collectée par les Crous) : **105 €** en 2026-2027, avec des exonérations possibles selon les situations. Règle-la sur **cvec.etudiant.gouv.fr** et envoie l'attestation à 3iS avec ton contrat d'inscription, au plus tard à la rentrée." },
  { category: "Démarches", question: "L'assurance responsabilité civile est-elle obligatoire ?", answer: "Oui, pour tous les élèves, mineurs ou majeurs : elle te couvre si tu blesses un camarade ou abîmes du matériel de l'école. Elle peut être incluse dans l'assurance de tes parents ; sinon, souscris-en une (MAIF, MGEN, La Banque Postale…)." },
  { category: "Démarches", question: "Comment fonctionne le chèque de caution ?", answer: "Le chèque de caution de **500 €** est à renouveler chaque année (valide un an). Le chèque 2026-2027 se remet en main propre à ton référent le jour de la rentrée. Les anciens chèques non récupérés au **18/12/2026** seront détruits." },
  { category: "Démarches", question: "Dois-je fournir une photo d'identité ?", answer: "Oui, à déposer dans ton dossier d'inscription ou de réinscription : elle sert à constituer les trombinoscopes de classe." },
  { category: "Vie pratique", question: "Où manger près de l'école ?", answer: "Une **cafétéria** est équipée dans chaque bâtiment (micro-ondes, réfrigérateurs, distributeurs). Tu peux aussi commander avant 11 h sur **Refectory (Dejbox)** et récupérer ton repas à la cafétéria. Boulangeries, supermarché Casino, restaurants et restauration rapide autour du campus : voir la page « Se restaurer » du wiki." },
  { category: "Vie pratique", question: "Existe-t-il une aide à la restauration ?", answer: "Oui, pour les étudiants en « zone blanche » (pas de restaurant universitaire à proximité) : **20 € par mois pour les non-boursiers**. L'école fait les démarches ; tu reçois une décision par mail et utilises une carte virtuelle dans l'application mobile." },
  { category: "Vie pratique", question: "Que faire en cas d'alarme incendie ?", answer: "Ferme les fenêtres, va calmement vers le couloir, sors en refermant la porte, suis les guides d'évacuation vers l'issue la plus proche, puis rejoins le point de rassemblement avec ta classe et ton enseignant. **Ascenseurs interdits.** En cas d'exercice ou de fausse alerte, reste au point de rassemblement jusqu'à l'autorisation de rentrer." },
  { category: "Vie pratique", question: "Où se loger près de l'école ?", answer: "3iS a des partenaires logement à Bègles : **Campus Bel Air** (Studently), **Canvas** (Greystar) et **La Quinta** (co-living). Ils offrent un traitement prioritaire et des avantages (frais de dossier réduits ou offerts). Détails dans la page « Logement étudiant » du wiki." },
];

export type GuideLink = { category: string; label: string; url: string; description: string };

export const GUIDE_LINKS: GuideLink[] = [
  { category: "Transports", label: "Pass Jeune TBM", url: "https://boutique.infotbm.com/products/34", description: "Abonnement illimité tram, bus, parcs-relais et abris vélos pour les moins de 27 ans : 21,40 € par mois" },
  { category: "Démarches", label: "CVEC : contribution de vie étudiante et de campus", url: "https://cvec.etudiant.gouv.fr", description: "Régler la CVEC (105 € en 2026-2027) ou demander une exonération" },
  { category: "Logement", label: "Campus Bel Air (Studently)", url: "https://www.studently.fr/residence/campus-bel-air-begles", description: "Résidence étudiante partenaire, 14 chemin Bel Air, Bègles" },
  { category: "Logement", label: "Canvas Bordeaux Bègles (Greystar)", url: "https://www.canvas-world.com/en/locations/france/bordeaux/canvas-bordeaux-begles", description: "Résidence étudiante partenaire, sans frais de dossier pour les étudiants 3iS" },
  { category: "Logement", label: "La Quinta (Vitanovae)", url: "https://www.vitanovae.com/quintaparc", description: "Co-living partenaire, 14 rue Lénine, Bègles" },
];

export type GuidePage = { title: string; slug: string; category: string; parent?: string; body: string };

const CAT = "Guide de rentrée 3iS";

export const GUIDE_PAGES: GuidePage[] = [
  {
    title: "Guide de rentrée 2026-2027", slug: "guide-de-rentree-2026-2027", category: CAT,
    body: `Bienvenue à **3iS Bordeaux** ! Cette page reprend le guide de rentrée de l'école, par thème.

## L'école

Créé en **1988**, 3iS forme chaque année environ **2 200 étudiants** aux métiers du cinéma, de l'audiovisuel, du son, du spectacle vivant, de l'acting, de l'animation et du jeu vidéo, sur ses campus de Paris, Bordeaux, Lyon, Nantes et Avignon. La pédagogie est axée sur les projets.

**Le campus de Bordeaux en chiffres** : 3 plateaux de tournage (cinéma, TV, spectacle vivant), 2 studios de son avec régie, 1 régie multi-caméras (plateau TV), 2 studios de mixage 5.1, 5 plateaux d'acting, 32 cabines de montage et de mixage, 19 salles de TD informatiques, 5 amphis, 12 salles de 230 places, 1 salle de projection, 1 magasin matériel, 2 cafétérias, 1 bureau des élèves, 2 bâtiments, 6 500 m² d'infrastructures.

## Les thèmes

- [[Accès au campus]]
- [[Logement étudiant]]
- [[Se restaurer]]
- [[Outils numériques]]
- [[Assiduité et règlement]]
- [[Signaler un comportement inapproprié]]
- [[Fournitures et équipement]]
- [[Démarches administratives]]
- [[Sécurité incendie]]
- [[Emprunter du matériel et réserver une salle]]
- [[Soutien et écoute]]

Les contacts de l'équipe sont dans l'annuaire : [Contacts](/contacts).`,
  },
  {
    title: "Accès au campus", slug: "acces-au-campus", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Adresses

- **36 rue des Terres Neuves (BT 36 Reinhardt), 33130 Bègles** : adresse principale
- **10 rue des Terres Neuves (BT 10 Dubuffet), 33130 Bègles**

## Ouverture

L'école est ouverte de **8h30 à 19h** en semaine. Le bâtiment 10 Dubuffet ferme à **18h30**. Les cours sont dispensés du lundi au vendredi et certains samedis.

## En tramway

**Ligne C ou ligne F**, direction Villenave Pyrénées ou Gare de Bègles, descendre aux arrêts **« Terres Neuves »** ou **« La Belle Rose »**. Les prochains passages sont dans la page [Mobilité](/mobilite).

## En voiture

Un parking et des places sont disponibles dans le quartier. Attention : c'est une **zone bleue**. Il faut un disque obligatoire, réglé sur ton heure d'arrivée et renouvelé toutes les deux heures. Tous les renseignements sont sur le site de la mairie de Bègles.

## En vélo et trottinette

Des racks sont disponibles. Prends **ton propre cadenas** (les cadenas SRA sont conseillés pour éviter les vols) et ne le laisse pas sur l'emplacement si tu ne t'en sers pas, pour ne pas bloquer une place.

## Abonnement TBM

Pour les moins de 27 ans, le **Pass Jeune** donne un accès illimité aux tramways, bus, parcs-relais et abris vélos de tout le réseau TBM : **21,40 € par mois**. [Voir la boutique TBM](https://boutique.infotbm.com/products/34).`,
  },
  {
    title: "Logement étudiant", slug: "logement-etudiant", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `Le campus de Bordeaux / Bègles a sélectionné des partenaires pour aider les étudiants à se loger : accès prioritaire à certains logements et avantages financiers.

## Campus Bel Air (résidence Studently)

- Adresse : 14 chemin Bel Air, Bègles. Site : [studently.fr](https://www.studently.fr/residence/campus-bel-air-begles)
- Contact : Clara Justin, campus.belair@studently.fr, 06 34 30 83 43
- 117 appartements du studio au T2 ; studio à partir de **691 €**
- Avantages 3iS : 15 appartements pré-réservés pour 3iS dès mars ; remise de 20 % sur les frais de dossier (280 € au lieu de 350 €) pour une location d'au moins 5 mois
- Offre promotionnelle : remise de 150 € par mois sur le loyer jusqu'en décembre 2026 pour tout nouveau locataire

## Canvas (résidence Greystar)

- Adresse : 310 boulevard Jean-Jacques Bosc, Bègles. Site : [canvas-world.com](https://www.canvas-world.com/en/locations/france/bordeaux/canvas-bordeaux-begles)
- Contact : Alphonsa Bocklant, alphonsa.blocklant@greystar.com, 06 74 18 75 40
- Appartements du studio au T2 ; studio à partir de **599 €**
- Avantages 3iS : aucun frais de dossier ; traitement prioritaire, avec choix de l'étage et de l'exposition (selon les disponibilités)

## La Quinta (co-living Vitanovae)

- Adresse : 14 rue Lénine, Bègles. Site : [vitanovae.com](https://www.vitanovae.com/quintaparc)
- Contact : Marie-Caroline Peychez, contact@vitanovae.com, 06 25 17 19 32
- 2 maisons de 6 et 11 chambres, à partir de **700 €**
- Avantages 3iS : frais de dossier offerts (290 €) ; traitement prioritaire`,
  },
  {
    title: "Se restaurer", slug: "se-restaurer", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Sur le campus

Une **cafétéria** est à disposition dans chaque bâtiment, avec micro-ondes, réfrigérateurs et distributeurs de boissons et de snacks.

**Refectory (Dejbox)** : commande tes repas **avant 11h** sur le site Refectory et récupère-les sur les étagères de la cafétéria.

## Autour du campus

- Boulangeries : Les Petits Pains de Louise (4 rue de la Belle Rose, Bègles) ; Le Moulin des Boulevards (307 bd Jean-Jacques Bosc, Bordeaux)
- Supermarché : Casino, 22 allée des Pruniers, Bègles
- Restaurants : Brasserie 59 (rue des Terres Neuves, Bègles) ; Fellini (316 bd Jean-Jacques Bosc, Bègles) ; Resto & Cie (17 avenue Robert Schuman, Bègles)
- Restauration rapide : Barger Burger (20 allée des Pruniers) ; Tutti Pizza (316 bd Jean-Jacques Bosc) ; Cosy Tacos (10 rue de la Belle Rose) ; Yaki Yaki (21 allée Jean Dubuffet) ; Bus Londonien, snacking (parking de la cité numérique, en face du bâtiment Reinhardt)

## Aide à la restauration étudiante

Elle concerne les étudiants en « **zones blanches** » : sites d'enseignement supérieur sans restaurant universitaire (Crous), ni restaurant agréé, ni autre solution de restauration à tarif modéré. Les démarches sont faites par l'école. Tu reçois par mail une décision d'attribution et un message pour accéder à la carte virtuelle, dans l'application mobile. L'aide est de **20 € par mois pour les non-boursiers**.`,
  },
  {
    title: "Outils numériques", slug: "outils-numeriques", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Wi-Fi

- Réseau : **3iS Etudiant**
- Identifiant : **prenom.nom**
- Mot de passe : celui de ton compte Office 3iS

Des affiches avec un QR code à flasher sont installées dans l'école. Voir la page [Wi-Fi et plan](/ecole).

## Webmail 3iS

Consulte-le régulièrement : l'école utilise ton adresse **prenom.nom@3is.fr** pour t'écrire. Elle donne aussi accès gratuitement à la suite Microsoft Office (Teams, Word, Excel, PowerPoint, OneDrive).

## Microsoft Teams

Canal de communication principal, avec ta boîte mail 3iS : groupes de classe, ressources, dépôt de documents. Consulte tes messages Teams régulièrement.

## Netypareo (Ypareo)

Emploi du temps, suivi de l'assiduité et notes. Consulte-le pour être averti des changements de planning.

## Econventionbordeaux

Pour éditer et signer tes conventions de stage.

## My 3iS

La plateforme qui regroupe tous les accès. Les codes d'accès sont envoyés à la rentrée. En cas de problème, contacte la vie scolaire.`,
  },
  {
    title: "Assiduité et règlement", slug: "assiduite-et-reglement", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Règlement intérieur

Tu t'es engagé à le respecter en le signant. Tu peux le consulter à tout moment sur **My 3iS** : « Règlement Intérieur 3iS ».

## Assiduité

La présence en cours est indispensable : les enseignements reposent beaucoup sur des travaux pratiques, des tournages et des projets collectifs. Une absence pèse sur ton apprentissage et sur le travail de ton équipe.

En cas d'absence ou de retard, préviens la **vie scolaire** (viescolaire.bordeaux@3is.fr, 05 56 51 90 30) et transmets les justificatifs demandés **sous 48 h**.

- Après **10 h** d'absences injustifiées cumulées : premier avertissement
- Après **30 h** : second avertissement et convocation à un entretien disciplinaire avec le directeur des études

Si tu rencontres une situation particulière (santé, traitement médical, difficultés personnelles), n'attends pas : contacte la vie scolaire pour connaître les aménagements possibles.

## Congé menstruel

Les étudiantes peuvent bénéficier d'un congé menstruel **jusqu'à 15 jours par année scolaire**, avec un certificat médical mentionnant l'année scolaire en cours à la première demande.

## Alternants

Les dates de vacances du calendrier prévisionnel valent pour la formation initiale. Pour les alternants, c'est le **planning d'alternance** qui fait foi : importe-le dans [Alternance](/alternance).`,
  },
  {
    title: "Signaler un comportement inapproprié", slug: "signaler-un-comportement-inapproprie", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Engagement contre les VHSS

L'école garantit un environnement d'études respectueux, inclusif et sécurisé. Les **violences et harcèlements sexistes et sexuels** ne sont pas tolérés. Tout signalement est traité sérieusement et peut donner lieu à des mesures disciplinaires. 3iS est partenaire **MeToo Media** depuis 2026.

## Qui peut signaler, et comment

Toute personne concernée, victime ou témoin (étudiant, salarié, stagiaire, intervenant). **Par e-mail ou par téléphone** auprès de la référente VHSS, **Marcia DESPORT** (mdesport@3is.fr), ou de toute personne de confiance de l'équipe permanente.

## Traitement

- Avec l'accord de la victime, le signalement est transmis à la Direction pour décider des suites.
- Sans accord, il n'est pas transmis, sauf si la gravité des faits impose d'agir (obligations légales).

## Suites possibles

Classement sans suite si les faits ne sont pas caractérisés, enquête interne, ou procédure disciplinaire. Sanctions selon le statut : avertissement, exclusion temporaire ou définitive (étudiants) ; avertissement, blâme, mise à pied, rétrogradation ou licenciement (salariés) ; avertissement ou arrêt de la collaboration (intervenants extérieurs).

## Protection et accompagnement

L'école protège les personnes qui signalent (confidentialité, absence de représailles) et propose un accompagnement adapté aux victimes : écoute, orientation, soutien psychologique ou juridique si nécessaire.`,
  },
  {
    title: "Fournitures et équipement", slug: "fournitures-et-equipement", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `Les éléments ci-dessous sont des recommandations. Seuls les équipements demandés pour **Acting** et **Régie technique / Technicien du spectacle** sont obligatoires.

## Matériel commun

- De quoi prendre des notes (cahier, classeur, stylos…)
- Pour les travaux dirigés : une tenue adaptée, avec des chaussures plates et fermées
- Un ordinateur portable est vivement recommandé pour la plupart des formations (une tablette peut convenir pour certaines activités)

## Régie technique et technicien du spectacle (obligatoire)

Les **équipements de protection individuelle** sont indispensables :

- chaussures de sécurité
- gants de protection
- casque de sécurité
- une lampe frontale est recommandée

## Son

Un ordinateur (portable de préférence), un disque dur externe (idéalement SSD), un casque de monitoring de qualité (Sennheiser, Audio-Technica, Beyerdynamic), un logiciel de production audio (Reaper ou Audacity pour débuter), et le livre *Les Techniques du son, tome 1* (Dunod).

## Acting

Une tenue souple, confortable et neutre est obligatoire pour les cours pratiques.

## Avantages étudiants

Dès l'activation de ton adresse 3iS, tu peux profiter de la plateforme **UNiDAYS** (réductions, dont Apple : environ 10 % sur une sélection de produits, avec une opération promotionnelle chaque rentrée).`,
  },
  {
    title: "Démarches administratives", slug: "demarches-administratives", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Photo d'identité

À déposer dans ton dossier d'inscription ou de réinscription : elle sert à constituer les trombinoscopes de classe.

## CVEC

Contribution obligatoire collectée par les Crous : **105 €** en 2026-2027, avec des exonérations possibles selon les situations. Règle-la sur [cvec.etudiant.gouv.fr](https://cvec.etudiant.gouv.fr) et envoie l'**attestation** à 3iS avec ton contrat d'inscription, au plus tard à la rentrée.

## Responsabilité civile

Assurance **obligatoire** pour tous les élèves : elle te couvre si tu blesses un camarade ou abîmes du matériel de l'école. Elle peut être incluse dans l'assurance de tes parents ; sinon, souscris-en une (MAIF, MGEN, La Banque Postale…).

## Chèque de caution

**500 €**, à renouveler chaque année (validité un an). Celui de 2026-2027 se remet en main propre à ton référent le jour de la rentrée. Les anciens chèques non récupérés au **18/12/2026** seront détruits.

## Carte étudiante

Elle n'est remise que lorsque ton dossier est complet : contrat d'inscription, chèque de caution, photo, CVEC, assurance responsabilité civile.`,
  },
  {
    title: "Sécurité incendie", slug: "securite-incendie", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `Il y a **deux points de rassemblement**, selon le bâtiment (36 ou 10). La procédure est la même.

## Si l'alarme se déclenche

1. Ferme les fenêtres.
2. Va calmement vers le couloir.
3. Sors de la salle en refermant la porte, puis rejoins l'issue de secours la plus proche. Ton enseignant te guide.
4. Suis les indications des guides d'évacuation.
5. Une fois dehors, rejoins le point de rassemblement.
6. Reste avec ta classe et ton enseignant pour faciliter le comptage.

## Important

- En cas d'exercice ou de déclenchement intempestif, reste au point de rassemblement jusqu'à l'autorisation de rentrer.
- L'utilisation des **ascenseurs est strictement interdite** pendant une évacuation.`,
  },
  {
    title: "Emprunter du matériel et réserver une salle", slug: "emprunter-du-materiel-et-reserver-une-salle", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Emprunter du matériel à l'école

Sous réserve de disponibilité. Envoie un mail **au moins deux semaines avant** au magasin (**magasin_bx@3is.fr**) et au référent de ta filière : date d'emprunt, référence du matériel, explication de ton projet. Le matériel est remis avec l'accord du référent et du magasin, sur présentation de la **carte étudiante**. Emprunt possible le week-end. **Le matériel est prioritaire pour les cours.**

- Chèque de caution de **500 €** : cours et projets de l'école
- Chèque de caution de **1 000 €** : projets personnels, rendu après vérification du bon état

Pour le matériel de la promo (prêt entre élèves), voir la page [Matériel](/materiel).

## Réserver une salle

Salles de cours, salles informatiques, cabines de montage et de son, plateaux de tournage (selon disponibilité, priorité aux cours). Va à l'accueil, ou écris à **viescolaire.bordeaux@3is.fr** en précisant le type de salle, la date et la durée. Pour les premières utilisations des espaces techniques, il faut l'accord de tes professeurs référents. Si tu n'utilises finalement pas la salle, préviens l'administration.`,
  },
  {
    title: "Soutien et écoute", slug: "soutien-et-ecoute", category: CAT, parent: "guide-de-rentree-2026-2027",
    body: `## Mon soutien psy

Dispositif du gouvernement pris en charge par l'Assurance Maladie : accompagnement auprès d'un psychologue conventionné, pour le mal-être, le stress, l'anxiété ou des difficultés personnelles.

- accès direct, sans passer par un médecin
- jusqu'à **12 séances par an**
- annuaire des psychologues partenaires (Santé Psy Étudiant), démarche confidentielle

## Nightline

Service d'écoute **gratuit, anonyme et confidentiel** par des étudiants bénévoles formés, sans jugement ni conseil imposé. Tous les soirs de **21 h à 2 h 30**, partout en France. Par téléphone au **05 82 95 10 11** ou par tchat.

## À l'école

Contacte la **vie scolaire** (05 56 51 90 30) ou la référente VHSS (Marcia DESPORT). Une salle infirmerie existe dans chaque bâtiment.`,
  },
];

export const GUIDE_SETTINGS = {
  school_address: "36 rue des Terres Neuves, 33130 Bègles",
  wifi_ssid: "3iS Etudiant",
  wifi_security: "EAP",
} as const;
