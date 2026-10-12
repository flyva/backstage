// Banque de questions pour le QCM d'habilitation électrique (10 tirées au hasard à chaque partie).
// Chaque question a 4 choix, un seul juste (answer = index). Contenu aligné sur la fiche /habilitation.

export type QuizQuestion = { q: string; choices: [string, string, string, string]; answer: 0 | 1 | 2 | 3 };

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ---------- Formules ----------
  { q: "Quelle est la formule de la puissance ?", choices: ["P = U × I", "P = U ÷ I", "P = I ÷ U", "P = U + I"], answer: 0 },
  { q: "Quelle est la formule de l'intensité ?", choices: ["I = U × P", "I = U ÷ P", "I = P ÷ U", "I = P × U"], answer: 2 },
  { q: "Quelle est la formule de la résistance (loi d'Ohm) ?", choices: ["R = U ÷ I", "R = I ÷ U", "R = U × I", "R = P ÷ U"], answer: 0 },
  { q: "Quelle est la tension entre une phase et le neutre, en France ?", choices: ["110 V", "230 V", "400 V", "12 V"], answer: 1 },
  { q: "Quelle est la tension entre deux phases, en tétraphasé ?", choices: ["230 V", "110 V", "400 V", "63 V"], answer: 2 },
  { q: "1 kW correspond à environ combien d'ampères en monophasé 230 V ?", choices: ["1 A", "4,3 A", "10 A", "43 A"], answer: 1 },
  { q: "Si U = 230 V et I = 10 A, quelle est la puissance ?", choices: ["23 W", "230 W", "2 300 W", "2,3 W"], answer: 2 },
  { q: "Si P = 2 000 W et U = 230 V, quelle est l'intensité ?", choices: ["2 A", "8,7 A", "20 A", "0,87 A"], answer: 1 },
  { q: "Si U = 230 V et I = 2 A, quelle est la résistance ?", choices: ["115 Ω", "460 Ω", "2 Ω", "228 Ω"], answer: 0 },
  { q: "Un calibre de 32 A en tétraphasé (3 phases) délivre au maximum :", choices: ["32 A", "64 A", "96 A", "128 A"], answer: 2 },
  { q: "Un calibre de 63 A en tétraphasé délivre au maximum :", choices: ["63 A", "126 A", "189 A", "252 A"], answer: 2 },
  { q: "27 600 W sous 230 V représentent environ :", choices: ["12 A", "120 A", "1 200 A", "27 A"], answer: 1 },

  // ---------- Dangers du courant ----------
  { q: "À partir de combien de mA un différentiel standard coupe-t-il le courant ?", choices: ["5 mA", "10 mA", "30 mA", "100 mA"], answer: 2 },
  { q: "Quel est l'effet d'un courant de 10 mA environ ?", choices: ["Rien du tout", "Tétanie musculaire (on ne peut plus lâcher)", "Mort immédiate", "Brûlure uniquement"], answer: 1 },
  { q: "À partir de quel courant la paralysie pulmonaire devient-elle un risque réel ?", choices: ["5 mA", "30 mA", "1 A", "2 A"], answer: 1 },
  { q: "Un courant de 1 A traversant le corps peut provoquer :", choices: ["Un simple picotement", "Un arrêt du cœur", "Rien de grave", "Une légère chaleur"], answer: 1 },
  { q: "En milieu sec, à partir de quelle tension le danger pour le corps humain commence-t-il ?", choices: ["12 V", "25 V", "50 V", "230 V"], answer: 2 },
  { q: "En milieu humide, à partir de quelle tension le danger commence-t-il ?", choices: ["10 V", "25 V", "50 V", "100 V"], answer: 1 },
  { q: "Pourquoi le risque électrique est-il plus grand en milieu humide ?", choices: ["L'eau isole le courant", "L'eau réduit la résistance du corps", "L'eau augmente la tension", "Ça n'a aucun rapport"], answer: 1 },
  { q: "Quel est le domaine de la très basse tension (TBT) ?", choices: ["0–50 V", "50–1 000 V", "Au-delà de 1 000 V", "0–12 V"], answer: 0 },
  { q: "Quel est le domaine de la basse tension (BT) ?", choices: ["0–50 V", "50–1 000 V", "Au-delà de 1 000 V", "100–200 V"], answer: 1 },
  { q: "À partir de quelle tension parle-t-on de haute tension (HT) ?", choices: ["230 V", "400 V", "1 000 V", "100 V"], answer: 2 },

  // ---------- Disjoncteurs ----------
  { q: "Que protège un disjoncteur différentiel ?", choices: ["L'installation contre les surtensions", "L'humain, contre une fuite de courant", "Le matériel contre la poussière", "Rien, c'est décoratif"], answer: 1 },
  { q: "Que protège un disjoncteur magnétothermique ?", choices: ["L'humain uniquement", "L'installation (court-circuit, surconsommation)", "Le neutre", "La terre"], answer: 1 },
  { q: "Qu'est-ce qu'un « disjoncteur diff » ?", choices: ["Un différentiel seul", "Un magnétothermique seul", "Les deux fonctions combinées", "Un type de prise"], answer: 2 },
  { q: "Un magnétothermique de 16 A coupe principalement en cas de :", choices: ["Fuite de 30 mA", "Surconsommation ou court-circuit", "Panne du neutre", "Coupure d'électricité générale"], answer: 1 },
  { q: "Un différentiel réagit à :", choices: ["La différence entre le courant qui part et qui revient", "La couleur du câble", "La température du boîtier", "La marque du matériel"], answer: 0 },

  // ---------- Câbles et calibres ----------
  { q: "Quelle section minimale de câble pour un calibre de 16 A ?", choices: ["1,5 mm²", "2,5 mm²", "6 mm²", "16 mm²"], answer: 1 },
  { q: "Quelle section minimale de câble pour un calibre de 32 A ?", choices: ["2,5 mm²", "4 mm²", "6 mm²", "10 mm²"], answer: 2 },
  { q: "Quelle section minimale de câble pour un calibre de 63 A ?", choices: ["6 mm²", "10 mm²", "16 mm²", "25 mm²"], answer: 2 },
  { q: "Quelle section minimale de câble pour un calibre de 125 A ?", choices: ["16 mm²", "25 mm²", "35 mm²", "50 mm²"], answer: 1 },
  { q: "Un circuit terminal (prise, lampe…) est câblé en :", choices: ["25 mm² maximum", "16 mm² maximum", "6 mm² maximum", "1,5 mm² maximum"], answer: 2 },

  // ---------- Couleurs des phases ----------
  { q: "Quelle est la couleur normalisée du neutre ?", choices: ["Vert et jaune", "Bleu", "Marron", "Noir"], answer: 1 },
  { q: "Quelles couleurs sont réservées au conducteur de terre (PE) ?", choices: ["Bleu uni", "Marron et noir", "Vert et jaune ensemble", "Gris"], answer: 2 },
  { q: "Combien de couleurs différentes sont utilisées pour les 3 phases en tétraphasé ?", choices: ["1", "2", "3", "4"], answer: 2 },
  { q: "Le conducteur de terre (vert/jaune) peut-il servir à autre chose ?", choices: ["Oui, en dépannage", "Non, jamais", "Oui, pour le neutre", "Oui, pour une phase"], answer: 1 },

  // ---------- IP et classes de matériel ----------
  { q: "Dans un indice IP, le premier chiffre concerne :", choices: ["Les liquides", "Les solides", "La température", "La tension"], answer: 1 },
  { q: "Dans un indice IP, le second chiffre concerne :", choices: ["Les solides", "Les liquides", "Le poids", "La couleur"], answer: 1 },
  { q: "Quel IP minimum pour un spectacle en intérieur ?", choices: ["IP 20", "IP 44", "IP 65", "IP 2X"], answer: 1 },
  { q: "Quel IP minimum pour une installation en extérieur ?", choices: ["IP 44", "IP 54", "IP 65", "IP 10"], answer: 2 },
  { q: "Que signifie IP 2X pour un électricien ?", choices: ["Le matériel est étanche", "Une pièce active peut rester sous tension", "Le matériel est hors service", "Rien de particulier"], answer: 1 },
  { q: "Qu'est-ce que la classe 0 d'un matériel électrique ?", choices: ["Double isolation", "Aucune protection particulière", "Très basse tension", "Mise à la terre obligatoire"], answer: 1 },
  { q: "Qu'est-ce que la classe 1 d'un matériel électrique ?", choices: ["Double isolation", "Toutes les parties métalliques sont mises à la terre", "Pas de protection", "Alimentation en 12 V uniquement"], answer: 1 },
  { q: "Qu'est-ce que la classe 2 d'un matériel électrique ?", choices: ["Double isolation", "Mise à la terre obligatoire", "Aucune protection", "Réservé à la très basse tension"], answer: 0 },
  { q: "Qu'est-ce que la classe 3 d'un matériel électrique ?", choices: ["Double isolation", "Très basse tension (TBT)", "Aucune protection", "Haute tension"], answer: 1 },
  { q: "Un appareil de classe II a-t-il besoin d'être relié à la terre ?", choices: ["Oui, toujours", "Non, la double isolation suffit", "Seulement en extérieur", "Seulement s'il est métallique"], answer: 1 },
  { q: "Le symbole « double carré » sur un appareil signifie :", choices: ["Classe 0", "Classe I", "Classe II (double isolation)", "Risque d'incendie"], answer: 2 },
  { q: "Le marquage CE sur un appareil signifie :", choices: ["Qu'il est de très bonne qualité", "Qu'il respecte les normes européennes", "Qu'il est garanti à vie", "Qu'il vient de Chine"], answer: 1 },

  // ---------- Habilitations NFC 18-510 ----------
  { q: "Que signifie l'habilitation B0 ?", choices: ["Exécutant électricien", "Exécutant non électricien", "Chargé de travaux", "Chargé d'intervention"], answer: 1 },
  { q: "Que signifie l'habilitation B1 ?", choices: ["Exécutant électricien", "Exécutant non électricien", "Chef de chantier uniquement", "Habilitation haute tension"], answer: 0 },
  { q: "Que signifie l'habilitation B2 ?", choices: ["Exécutant non électricien", "Exécutant électricien simple", "Chef, chargé de travaux", "Chargé d'intervention élémentaire"], answer: 2 },
  { q: "Que signifie l'habilitation BS ?", choices: ["Chargé d'intervention élémentaire (BT)", "Chef de gros chantiers", "Habilitation haute tension", "Exécutant non électricien"], answer: 0 },
  { q: "Le préfixe « B » dans une habilitation signifie :", choices: ["Basse tension", "Bâtiment", "Bureau d'études", "Haute tension"], answer: 0 },
  { q: "Le préfixe « H » dans une habilitation signifie :", choices: ["Horaire", "Haute tension", "Habilité temporairement", "Hors service"], answer: 1 },
  { q: "L'indice « V » dans une habilitation signifie :", choices: ["Vérification", "Voisinage renforcé", "Visite", "Validité"], answer: 1 },
  { q: "L'indice « V » (voisinage renforcé) s'applique à partir de quelle distance d'une pièce nue sous tension ?", choices: ["3 cm", "30 cm", "1 m", "3 m"], answer: 1 },
  { q: "Un BS peut-il réarmer un disjoncteur sur un circuit terminal ?", choices: ["Oui", "Non, jamais", "Seulement avec un B2", "Seulement en haute tension"], answer: 0 },
  { q: "Un B0 peut-il intervenir directement sur une installation électrique ?", choices: ["Oui, sans restriction", "Non, il peut seulement travailler à proximité", "Oui, mais seulement en BT", "Oui, avec un simple VAT"], answer: 1 },
  { q: "Qui dirige des travaux électriques selon la norme NFC 18-510 ?", choices: ["Le B0", "Le BS", "Le B2 (chargé de travaux)", "N'importe qui sur le chantier"], answer: 2 },
  { q: "Quelle norme encadre les habilitations électriques en France ?", choices: ["NF C 15-100", "NFC 18-510", "ISO 9001", "NF EN 60947"], answer: 1 },
  { q: "H0, H1 et H2 sont les équivalents de B0, B1 et B2 pour :", choices: ["Le domaine basse tension", "Le domaine haute tension", "Les bâtiments publics", "Les chantiers extérieurs"], answer: 1 },
  { q: "Qu'est-ce qu'un circuit terminal ?", choices: ["Le tableau électrique principal", "Une prise, un chauffage, une lampe", "Le compteur électrique", "Le groupe électrogène"], answer: 1 },
  { q: "Un circuit terminal doit être, pour une intervention BS :", choices: ["Sous tension", "Hors tension", "En haute tension", "Peu importe"], answer: 1 },

  // ---------- EPI ----------
  { q: "Qui fournit les EPI selon le cours ?", choices: ["Chacun achète les siens", "L'employeur", "L'école uniquement", "Personne, ce n'est pas obligatoire"], answer: 1 },
  { q: "Qui est responsable de l'entretien de ses propres EPI ?", choices: ["L'employeur", "L'exécutant lui-même", "Le fabricant", "Personne"], answer: 1 },
  { q: "Que doit-on vérifier sur ses chaussures avant une intervention ?", choices: ["Qu'elles sont neuves", "Qu'elles sont attachées et sans rien sous la semelle", "Qu'elles sont en cuir", "Rien de particulier"], answer: 1 },
  { q: "Le casque électricien doit porter :", choices: ["Une étiquette de taille", "Le double triangle", "Un QR code", "Rien de spécifique"], answer: 1 },
  { q: "À quoi sert le tapis isolant ?", choices: ["À isoler l'opérateur du sol", "À poser ses outils", "À décorer le poste de travail", "À rien de particulier"], answer: 0 },
  { q: "Pourquoi évite-t-on le métal dans les vêtements d'intervention ?", choices: ["Pour le confort", "Parce que le métal conduit l'électricité", "Pour des raisons esthétiques", "Pour la chaleur"], answer: 1 },
  { q: "Que signifie VAT ?", choices: ["Vérificateur d'absence de tension", "Valeur admise de tension", "Validation d'accès technique", "Vérification annuelle du tableau"], answer: 0 },
  { q: "Peut-on garder sa montre ou son téléphone sur soi pendant une intervention électrique ?", choices: ["Oui, sans problème", "Non, il faut les retirer", "Seulement la montre", "Seulement le téléphone"], answer: 1 },
  { q: "Les gants isolants doivent être vérifiés :", choices: ["Une fois par an seulement", "Avant chaque intervention", "Jamais, ils sont fiables à vie", "Uniquement par le fabricant"], answer: 1 },
  { q: "Le vêtement de travail recommandé est plutôt :", choices: ["En coton, manches courtes", "En synthétique, manches longues", "Peu importe la matière", "En laine épaisse"], answer: 1 },

  // ---------- Consignation (5 étapes) ----------
  { q: "Quelle est la première étape de la consignation ?", choices: ["Couper le courant", "Vérifier ses EPI", "Prévenir le responsable", "Utiliser le VAT"], answer: 1 },
  { q: "Quelle est la deuxième étape de la consignation ?", choices: ["Poser un bloqueur", "Couper le courant", "Faire le VAT", "Appeler le patron"], answer: 1 },
  { q: "À quoi sert le bloqueur posé sur le disjoncteur ?", choices: ["À décorer l'armoire", "À empêcher quelqu'un de remettre le courant", "À mesurer l'intensité", "À rien, c'est symbolique"], answer: 1 },
  { q: "Quelles informations figurent sur la fiche technique du bloqueur ?", choices: ["Nom, prénom, date, numéro de téléphone", "Uniquement le nom de l'entreprise", "La météo du jour", "Le numéro de série du disjoncteur"], answer: 0 },
  { q: "À quel moment utilise-t-on le VAT dans la procédure ?", choices: ["Avant de couper le courant uniquement", "Après avoir posé le bloqueur, pour vérifier l'absence de tension", "Jamais, c'est facultatif", "Uniquement en fin de journée"], answer: 1 },
  { q: "Pourquoi teste-t-on le VAT avant ET après le contrôle d'absence de tension ?", choices: ["Pour perdre du temps", "Pour s'assurer qu'il fonctionnait vraiment pendant le test", "Ce n'est pas nécessaire", "Pour respecter une tradition"], answer: 1 },
  { q: "Quelle est la dernière étape avant de commencer une intervention ?", choices: ["Couper le courant", "Prévenir le responsable", "Retirer ses EPI", "Rebrancher le courant"], answer: 1 },
  { q: "Que signifie « délester l'armoire » ?", choices: ["La nettoyer", "Couper l'alimentation générale", "La repeindre", "La déplacer"], answer: 1 },
  { q: "Un tournevis utilisé en intervention électrique doit être :", choices: ["En métal nu", "Isolé", "Le plus long possible", "Peu importe"], answer: 1 },
  { q: "Combien d'étapes compte la procédure de consignation présentée dans le cours ?", choices: ["3", "4", "5", "7"], answer: 2 },

  // ---------- Danger / premiers secours ----------
  { q: "Que faut-il faire en premier si une personne est électrisée et toujours en contact avec la source ?", choices: ["La toucher pour l'écarter", "Couper le courant avant de s'approcher", "Lui donner de l'eau", "Attendre qu'elle bouge"], answer: 1 },
  { q: "Quel numéro appeler en cas d'accident grave en France ?", choices: ["15, 18 ou 112", "36 15", "0800", "Le numéro de l'école uniquement"], answer: 0 },
  { q: "Quel type d'extincteur utiliser sur un feu d'origine électrique ?", choices: ["De l'eau", "CO2 ou poudre", "Du sable uniquement", "Rien, il faut fuir"], answer: 1 },
  { q: "Pourquoi ne jamais utiliser d'eau sur un feu électrique sous tension ?", choices: ["L'eau conduit le courant", "L'eau n'éteint rien", "C'est juste une habitude", "L'eau abîme le matériel"], answer: 0 },

  // ---------- Spectacle / contexte métier ----------
  { q: "Pourquoi le risque électrique augmente-t-il avec une machine à fumée ou de la pluie scénique ?", choices: ["L'humidité réduit la résistance du corps", "Ça n'a aucun effet", "Ça améliore l'isolation", "Ça refroidit le matériel"], answer: 0 },
  { q: "Un groupe électrogène doit être mis à la terre :", choices: ["Jamais", "Toujours, comme une installation fixe", "Seulement en intérieur", "Seulement s'il pleut"], answer: 1 },
  { q: "Travailler en hauteur près d'une ligne électrique (accroche de projecteurs) demande :", choices: ["Aucune précaution particulière", "Une distance de sécurité et une vigilance renforcée", "De couper tout le bâtiment", "D'attendre la nuit"], answer: 1 },
  { q: "Une batterie de micro HF ou de projecteur LED en court-circuit peut provoquer :", choices: ["Rien de grave", "Un échauffement voire un incendie", "Une simple perte de charge", "Une amélioration du son"], answer: 1 },
  { q: "Dans l'exemple du cours, pourquoi choisit-on une ligne 63 A plutôt que 32 A ?", choices: ["Par habitude", "Parce que 32 A tétraphasé (96 A) ne suffit pas pour 120 A nécessaires", "Parce que c'est moins cher", "Parce que le matériel l'exige par sa couleur"], answer: 1 },
  { q: "Dans l'exemple du cours, quelle est la puissance totale du matériel listé ?", choices: ["12,6 kW", "19,6 kW", "27,6 kW", "35,6 kW"], answer: 2 },
];
