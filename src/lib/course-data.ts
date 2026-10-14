// Contenu des « cours » importables dans le wiki (catégorie « Cours »), sur le même principe que le guide de rentrée
// (src/lib/guide-data.ts) : une liste de pages, importées dans le wiki puis éditables normalement (texte, historique,
// sous-pages). Relancer l'import d'un cours met à jour le texte de ses pages avec la dernière version ci-dessous —
// pratique pour corriger ou compléter un cours au fil du temps. Ajouter un nouveau cours = ajouter une entrée ici ;
// il apparaît tout seul dans la liste d'import de la page Administration.
//
// Chaque matière = une page principale (une seule, pas une forêt de sous-pages) + une « Fiche mémo » (sous-page),
// résumé ultra-condensé pour réviser vite. `replaces` liste les anciens slugs qu'une restructuration remplace : ils
// sont supprimés automatiquement au prochain import.

export type CoursePage = { title: string; slug: string; parent?: string; body: string };
export type Course = { key: string; label: string; description: string; replaces?: string[]; pages: CoursePage[] };

export const COURSES: Course[] = [
  {
    key: "reseaux",
    label: "Réseaux",
    description: "Une seule page complète : histoire, vocabulaire, PAN/LAN/MAN/WAN, adresses MAC/IP/IPv4/IPv6, Dante et Art-Net — plus une fiche mémo.",
    replaces: [
      "reseaux-notions-de-base", "histoire-des-reseaux-et-dinternet", "bit-octet-et-debit",
      "tailles-de-reseaux-pan-lan-man-wan", "adressage-mac-ip-ipv4-ipv6", "le-reseau-local-lan-switch-routeur",
      "dante-et-artnet", "glossaire-reseaux",
    ],
    pages: [
      {
        title: "Réseaux",
        slug: "reseaux",
        body: `## 🌐 Introduction

Un **réseau informatique**, c'est juste un ensemble d'appareils reliés entre eux pour **échanger des données** — fichiers, pages web, son, DMX… En régie, impossible d'y couper : la lumière (Art-Net, sACN), le son (Dante, AES67) et la vidéo (NDI) passent de plus en plus **par un câble réseau plutôt qu'un câble dédié**. Un seul câble Ethernet bien configuré peut remplacer des dizaines de câbles DMX ou audio. Autant comprendre comment ça marche avant d'en dépendre un soir de show.

## 🕰️ Un peu d'histoire

- **1969** : premier message envoyé sur **ARPANET**, l'ancêtre militaire d'Internet, entre deux ordinateurs américains. Objectif : écrire « LOGIN ». Le système plante après « LO ». Grande première quand même.
- **1973** : Robert Metcalfe invente **Ethernet** chez Xerox : naissance du **LAN**, le réseau local.
- **1982** : en France, le **Minitel** permet déjà de consulter des services en ligne via le téléphone — jusqu'en 2012 !
- **1983** : adoption de **TCP/IP**, le langage commun qui permet à tous les réseaux du monde de se parler. C'est la vraie naissance d'Internet tel qu'on le connaît.
- **1989-1991** : Tim Berners-Lee invente le **World Wide Web** au CERN. ⚠️ Le Web n'est pas Internet : Internet est l'infrastructure (câbles, protocoles), le Web est un service qui tourne dessus — comme l'e-mail ou le streaming.
- **Années 1990** : le modem **56K** démocratise Internet à la maison. Ligne téléphonique monopolisée, bruit de connexion caractéristique, environ 7 Ko/s dans le meilleur des cas (charger une photo = plusieurs dizaines de secondes).
- **2000s-2020s** : ADSL, Wi-Fi, fibre optique, 4G puis 5G — les débits explosent.

## 🔢 Bit, octet et débit

Un ordinateur ne connaît que deux états : **0** ou **1**, un **bit**. Huit bits forment un **octet** (256 valeurs possibles).

> **Le piège classique** : les débits réseau s'expriment en **bits par seconde** (Mb/s, avec un petit b), les tailles de fichiers en **octets par seconde** (Mo/s, avec un grand O). 1 octet = 8 bits, donc une ligne à **100 Mb/s** télécharge au mieux à environ **12,5 Mo/s**, pas 100 Mo/s !

## 📏 PAN, LAN, MAN, WAN : la taille du réseau

| Type | Étendue | Exemple |
| --- | --- | --- |
| 📱 **PAN** | Quelques mètres | Casque Bluetooth, montre connectée |
| 🏠 **LAN** | Un bâtiment, un site | Le réseau d'une salle de spectacle |
| 🏙️ **MAN** | Une ville | Le réseau fibre d'une métropole |
| 🌍 **WAN** | Un pays, le monde | Internet — le plus grand WAN qui existe |

## 🏷️ Deux adresses pour un appareil : MAC et IP

| | Adresse MAC | Adresse IP |
| --- | --- | --- |
| C'est quoi | Identifiant **physique**, gravé en usine | Identifiant **logique**, attribué par le réseau |
| Change si on change de réseau ? | Non, fixe à vie | Oui |
| Sert à | Le **switch**, à l'intérieur du LAN | Le **routeur**, entre réseaux |
| Format | \`00:1A:2B:3C:4D:5E\` | \`192.168.1.42\` (IPv4) |

**IPv4** : 4 octets, environ **4,3 milliards** d'adresses possibles — ça paraissait énorme en 1980, c'est devenu trop petit. D'où les adresses **privées** (\`192.168.x.x\`, \`10.x.x.x\`…), jamais visibles sur Internet, et **publiques**, uniques (le routeur fait la traduction entre les deux, le **NAT**).

**IPv6**, la relève : 16 octets en hexadécimal (\`2001:db8::1\`), environ **340 undécillions** d'adresses (340 suivi de 36 zéros). De quoi voir venir.

## 🔌 Le réseau local : switch et routeur

- Le **switch** relie les appareils **entre eux** à l'intérieur d'un LAN : il apprend l'adresse MAC de chacun et n'envoie les données qu'au bon port.
- Le **routeur** relie des réseaux **différents** entre eux (le LAN vers Internet) : il route les paquets, distribue les adresses IP (**DHCP**), fait le **NAT**, et filtre souvent un minimum le trafic entrant.

> **Switch = à l'intérieur du LAN. Routeur = entre deux réseaux.** Si tu ne retiens qu'une phrase, c'est celle-là.

## 🎚️ Dante et Art-Net : le son et la lumière en réseau

Deux protocoles **à connaître par cœur** en régie : les deux remplacent des câbles dédiés par de l'Ethernet standard.

- **Dante** (Audinate) transporte des **centaines de canaux audio** numériques sur un câble réseau. Switch Gigabit conseillé, logiciel **Dante Controller** pour patcher à la souris, latence très faible, compatible **AES67**. Toujours en filaire, jamais en Wi-Fi.
- **Art-Net** transporte un ou plusieurs **univers DMX (512 canaux)** sur Ethernet, là où le DMX classique est limité à un univers par câble. Fonctionne souvent en broadcast (attention à bien segmenter le réseau). Un **nœud (node)** convertit le signal en sortie DMX XLR classique. Alternative plus récente : **sACN**.
- Les deux **sur le même réseau** sans précaution : déconseillé. On sépare les usages avec des **VLAN** sur un switch managé.

## 📖 Petit lexique

**Le matériel**
- **Switch** — relie les appareils d'un même LAN, intelligemment (par adresse MAC).
- **Routeur** — relie des réseaux différents entre eux (ex. LAN ↔ Internet).
- **Hub** — l'ancêtre du switch, répète tout à tout le monde. Obsolète.
- **Modem** — convertit un signal numérique en signal transmissible (ligne téléphonique…).
- **Câble RJ45 / Ethernet** — le câblage standard d'un LAN filaire.

**Les protocoles**
- **TCP/IP** — le langage commun de tous les réseaux, adopté en 1983.
- **DHCP** — attribue automatiquement une adresse IP à qui se connecte.
- **DNS** — traduit un nom de domaine (google.com) en adresse IP.
- **NAT** — traduit les adresses IP privées d'un LAN vers l'adresse publique du routeur.
- **Dante / Art-Net / sACN / AES67 / NDI** — voir plus haut : audio, lumière et vidéo sur IP.

**Les tailles et unités**
- **Bit / octet** — 0 ou 1 ; 8 bits = 1 octet.
- **PAN / LAN / MAN / WAN** — du plus petit (une personne) au plus grand (le monde) réseau.
- **IPv4 / IPv6** — les deux versions d'adresse IP, 32 bits vs 128 bits.
- **Bande passante / débit** — capacité maximale théorique vs quantité réellement transmise.
- **Latence** — le délai de transmission d'une donnée.

## 🧠 Quiz éclair

**1.** Une connexion à 100 Mb/s télécharge à peu près à…
💡 *Réponse : environ 12,5 Mo/s (on divise par 8, pas 100 Mo/s).*

**2.** Qu'est-ce qui relie deux réseaux différents entre eux ?
💡 *Réponse : le routeur (le switch reste à l'intérieur d'un même LAN).*

**3.** 1969, 1973, 1983 : à quoi correspondent ces trois dates ?
💡 *Réponse : premier message sur ARPANET, invention d'Ethernet, adoption de TCP/IP.*

**4.** Pourquoi toujours câbler Dante en filaire plutôt qu'en Wi-Fi ?
💡 *Réponse : pour garder une latence stable et très faible, indispensable en audio live.*

*Cours à compléter au fil de l'année. Voir aussi la [[Réseaux — Fiche mémo]] pour réviser vite.*`,
      },
      {
        title: "Réseaux — Fiche mémo",
        slug: "reseaux-fiche-memo",
        parent: "reseaux",
        body: `Révision express avant un contrôle ou un montage. Détails complets : [[Réseaux]].

## À retenir en un coup d'œil

| Notion | Ce qu'il faut retenir |
| --- | --- |
| Bit / octet | 1 octet = 8 bits |
| Débit vs taille fichier | Débit en **b/s** (bits) ; fichier en **o/s** (octets) ; diviser par 8 pour convertir |
| PAN | Quelques mètres (Bluetooth) |
| LAN | Un bâtiment / un site |
| MAN | Une ville |
| WAN | Un pays / le monde — Internet est le plus grand WAN |
| Adresse MAC | Physique, fixe, utilisée par le **switch**, dans le LAN uniquement |
| Adresse IP | Logique, change selon le réseau, utilisée par le **routeur** |
| IPv4 | 32 bits, ≈ 4,3 milliards d'adresses |
| IPv6 | 128 bits, ≈ 340 undécillions d'adresses |
| Switch | Relie les appareils **entre eux**, dans un même LAN |
| Routeur | Relie des réseaux **différents** entre eux |
| DHCP | Attribue les adresses IP automatiquement |
| NAT | Traduit IP privée ↔ IP publique |
| Dante | Audio multicanal sur IP, toujours en filaire |
| Art-Net | DMX sur Ethernet, plusieurs univers sur un seul câble |

## Dates clés

1969 ARPANET → 1973 Ethernet → 1982 Minitel → 1983 TCP/IP → 1991 Web public → 1990s modem 56K → 2000s+ ADSL / Wi-Fi / fibre / 4G-5G.`,
      },
    ],
  },
  {
    key: "meca",
    label: "Mécanique",
    description: "Une seule page complète : forces, résultante, angle et charge sur élingues, CMU — plus une fiche mémo.",
    replaces: [
      "mecanique-du-spectacle-notions-de-base", "forces-masse-et-poids", "resultante-de-forces-et-triangle-des-forces",
      "angle-et-charge-sur-elingues", "cmu-et-coefficient-de-securite", "glossaire-mecanique",
    ],
    pages: [
      {
        title: "Mécanique",
        slug: "mecanique",
        body: `## 🏗️ Introduction

Dès qu'on lève, suspend ou retient quelque chose en régie — un pont au gril, une enceinte accrochée, une structure autoportée — on fait de la **mécanique**, qu'on le sache ou non. Mal évaluer une force ou un angle peut faire céder un ancrage ou une élingue. Ce cours donne les bases pour comprendre ce qui se passe réellement quand une charge est suspendue, avant même de toucher au matériel de levage.

## ⚖️ Forces, masse et poids

Une **force** n'est pas juste un nombre : c'est un **vecteur**, avec une direction, un sens et une intensité, en **newtons (N)**.

- **Masse** (kg) : une quantité de matière, constante partout.
- **Poids** (N) : la force exercée par la gravité sur cette masse → \`Poids = masse × g\` (g ≈ 9,81 m/s² sur Terre).

**Le raccourci du terrain** : **1 kg ≈ 1 daN** (décanewton), puisque 1 kgf = 9,81 N ≈ 10 N. C'est une approximation (≈ 2 % d'écart), mais c'est pour ça que tout le monde raisonne **en kg** sur un plateau, y compris les calculettes de ce cours.

## 📐 Résultante et triangle des forces

Quand plusieurs forces s'appliquent au même point, leur effet combiné est une seule force équivalente : la **résultante**. On ne peut pas juste additionner des intensités si les directions diffèrent — il faut les additionner **vectoriellement** (méthode du triangle : on met les flèches bout à bout, la résultante va du départ à l'arrivée).

Cas très courant : une charge suspendue par **deux brins symétriques**. Le poids tire vers le bas, chaque brin tire vers le haut selon son angle. Pour que ça tienne en équilibre, la somme des composantes **verticales** des deux tensions doit égaler le poids — et plus l'angle au sol est petit, plus il faut de tension pour fournir la même composante verticale.

## 🪢 Angle et charge sur élingues

\`\`\`
T = Charge ÷ (nombre de brins × sin(angle au sol))
\`\`\`

Autrement dit : \`T = Charge ÷ (nombre de brins × sin(angle))\`. L'angle au sol est mesuré entre le brin et l'**horizontale** (90° = brin vertical). C'est exactement le calcul de la calculette **Angle et charge sur élingues** (Calculettes → Mécanique).

**Exemple avec 200 kg sur 2 brins symétriques :**

| Angle au sol | sin(angle) | Tension par brin | Facteur vs idéal (100 kg) |
| --- | --- | --- | --- |
| 90° (vertical) | 1,00 | 100 kg | × 1,00 |
| 60° | 0,87 | 115 kg | × 1,15 |
| 45° | 0,71 | 141 kg | × 1,41 |
| 30° | 0,50 | 200 kg | × 2,00 |
| 15° | 0,26 | 387 kg | × 3,86 |

**Plus l'angle se referme, plus la tension explose.** Sous 30°, la tension dépasse déjà le double de l'idéal : angle généralement **déconseillé**.

> 🎯 **Règle du pouce** : privilégier des angles **au-dessus de 45°**. Entre 30° et 45°, vérifier très largement la CMU. Sous 30°, éviter ou recalculer avec une grosse marge.

## 🛡️ CMU et coefficient de sécurité

La **CMU** (charge maximale d'utilisation, *WLL* en anglais) est la charge max qu'un accessoire de levage (élingue, manille, point d'ancrage…) peut supporter en usage normal. Elle est gravée ou étiquetée sur le matériel pro — **jamais d'accessoire à CMU inconnue ou illisible**.

La CMU n'est pas la charge de rupture : elle intègre déjà une marge, le **coefficient de sécurité** (souvent entre 5 et 10 en spectacle) :

\`\`\`
Charge de rupture ≈ CMU × coefficient de sécurité
\`\`\`

Ce coefficient absorbe l'usure, les chocs, les erreurs d'estimation. **On ne le consomme jamais volontairement** en dépassant la CMU affichée. Et surtout : une élingue inclinée travaille avec une **tension réelle** supérieure à la charge divisée bêtement par le nombre de brins (voir le tableau ci-dessus) — c'est **cette tension réelle** qu'il faut comparer à la CMU, pas la charge totale.

## 📖 Petit lexique

- **Angle au sol** — angle entre un brin d'élingue et l'horizontale.
- **CMU** — charge maximale d'utilisation d'un accessoire de levage.
- **Coefficient de sécurité** — marge entre CMU et charge de rupture réelle.
- **daN** — décanewton, ≈ le poids d'une masse de 1 kg sur Terre.
- **Élingue en V** — élingue à deux brins symétriques depuis un point de levage.
- **Force** — action vectorielle (direction, sens, intensité) capable de déplacer ou déformer.
- **Newton (N)** — unité de force du Système international.
- **Poids** — force exercée par la gravité sur une masse (poids = masse × g).
- **Résultante** — force unique équivalente à plusieurs forces combinées.
- **WLL** — *Working Load Limit*, l'équivalent anglais de la CMU.

## 🧠 Quiz éclair

**1.** Une charge de 300 kg sur 2 brins verticaux (90°) : quelle tension par brin ?
💡 *Réponse : 150 kg (300 ÷ 2, cas idéal).*

**2.** Pourquoi éviter un angle au sol inférieur à 30° ?
💡 *Réponse : la tension dans chaque brin dépasse déjà le double de l'idéal, le risque augmente vite.*

**3.** La CMU, c'est la charge à laquelle le matériel casse ?
💡 *Réponse : non ! La CMU inclut déjà une marge (coefficient de sécurité) ; la charge de rupture réelle est bien plus haute.*

*Cours à compléter au fil de l'année. Voir aussi la [[Mécanique — Fiche mémo]] pour réviser vite.*`,
      },
      {
        title: "Mécanique — Fiche mémo",
        slug: "mecanique-fiche-memo",
        parent: "mecanique",
        body: `Révision express avant un contrôle ou un montage. Détails complets : [[Mécanique]].

## Formules clés

| Formule | Ce que ça donne |
| --- | --- |
| Poids = masse × g (g ≈ 9,81 m/s²) | Le poids en newtons à partir de la masse en kg |
| 1 kg ≈ 1 daN | Raccourci terrain (≈ 2 % d'écart) |
| T = Charge ÷ (brins × sin(angle au sol)) | Tension dans chaque brin d'une élingue symétrique |
| Charge de rupture ≈ CMU × coefficient de sécurité | Ce que la CMU laisse déjà en marge |

## Tableau angle → facteur (2 brins)

| Angle au sol | Facteur de tension |
| --- | --- |
| 90° | × 1,00 |
| 60° | × 1,15 |
| 45° | × 1,41 |
| 30° | × 2,00 (seuil d'alerte) |
| 15° | × 3,86 (à éviter) |

**Règle du pouce** : angles > 45° confortables, 30-45° à vérifier, < 30° déconseillé.`,
      },
    ],
  },
  {
    key: "electricite",
    label: "Électricité",
    description: "Une seule page complète : tension/intensité/puissance, mono/triphasé, section de câble, et l'habilitation électrique — plus une fiche mémo.",
    pages: [
      {
        title: "Électricité",
        slug: "electricite",
        body: `## ⚡ Introduction

L'électricité, c'est le nerf de la guerre en régie : sans elle, pas de son, pas de lumière, pas de vidéo. C'est aussi un domaine où une erreur peut **tuer** — ce cours pose les bases pour calculer juste, et la page se termine sur l'**habilitation électrique**, le droit légal d'intervenir sur des installations électriques.

## 🔋 Tension, intensité, résistance, puissance

Quatre grandeurs, reliées par la **loi d'Ohm** et la formule de puissance :

\`\`\`
U = R × I        P = U × I
U : tension (volts, V)       I : intensité (ampères, A)
R : résistance (ohms, Ω)     P : puissance (watts, W)
\`\`\`

Deux grandeurs connues suffisent pour retrouver les deux autres — c'est exactement ce que fait la calculette **Loi d'Ohm** (Calculettes → Électricité) : donne deux valeurs, elle calcule le reste.

## 🏠 Monophasé et triphasé

- **Monophasé** (230 V) : une seule phase + neutre. La prise de courant classique.
- **Triphasé / tétraphasé** (400 V, 3 phases + neutre) : utilisé pour les grosses puissances (gradateurs, régies son/lumière complètes), permet de **répartir la charge sur 3 phases** plutôt qu'une seule.

Pour une installation de spectacle, on compare la puissance totale demandée à la capacité d'une ligne (calibre × nombre de phases). C'est la méthode de la calculette **Bilan de puissance** : additionne ton matériel, elle trouve le calibre (16, 32, 63 ou 125 A) qui convient. La calculette **Prises par phase** fait l'inverse : combien de prises 16/32/63 A pour une puissance donnée.

## 🧵 Section de câble et chute de tension

Un câble trop fin sur une trop longue distance fait chuter la tension en bout de ligne (et peut chauffer dangereusement). La calculette **Câble** (Calculettes → Électricité) calcule l'intensité, la chute de tension et la longueur maximale admissible pour une section donnée, en cuivre, avec une chute limite de 3 % (éclairage) ou 5 % (autres usages).

## 🦺 Habilitation électrique

L'**habilitation électrique** est l'autorisation donnée par un employeur à une personne, pour exécuter des opérations électriques en sécurité. Ce n'est **pas un diplôme** : c'est une reconnaissance, par l'employeur, que la personne a les compétences nécessaires (après une formation), renouvelée périodiquement.

Le symbole d'habilitation se lit en 2 à 3 caractères : par exemple **B1V** = basse tension (B), exécutant (1), travaux sous tension (V). **B0** = non électricien, simple exécution de travaux d'ordre non électrique en sécurité. **BS** = intervention élémentaire (remplacer un fusible, réarmer un disjoncteur…).

➡️ **La page [Habilitation électrique](/habilitation) du menu Travail → Cours détaille tout en profondeur** : tableau complet des symboles (NF C 18-510), dangers électriques, EPI, procédure de consignation en 4 étapes, et un quiz de plus de 100 questions pour réviser. Cette section n'en est qu'un résumé — vas-y pour creuser.

## 📖 Petit lexique

- **Ampère (A)** — unité d'intensité du courant.
- **Volt (V)** — unité de tension.
- **Watt (W)** — unité de puissance.
- **Ohm (Ω)** — unité de résistance.
- **Monophasé** — alimentation à une seule phase (230 V).
- **Triphasé / tétraphasé** — alimentation à 3 phases + neutre (400 V), pour les grosses puissances.
- **Chute de tension** — perte de tension entre le départ et l'arrivée d'un câble, due à sa résistance.
- **Calibre** — intensité maximale que supporte un disjoncteur ou une ligne (16, 32, 63, 125 A…).
- **Habilitation électrique** — autorisation donnée par l'employeur pour intervenir sur une installation électrique.
- **Consignation** — procédure en 4 étapes pour mettre une installation hors tension en sécurité avant d'y travailler.

## 🧠 Quiz éclair

**1.** Tu connais U et P, comment trouver I ?
💡 *Réponse : I = P ÷ U (loi d'Ohm combinée à P = U × I).*

**2.** Pourquoi passer en triphasé plutôt que monophasé pour une grosse installation ?
💡 *Réponse : ça répartit la puissance sur 3 phases au lieu d'une seule, donc une ligne de même calibre supporte 3 fois plus.*

**3.** L'habilitation électrique, c'est un diplôme ?
💡 *Réponse : non, c'est une autorisation donnée par l'employeur, après formation, reconnaissant que la personne a les compétences nécessaires.*

*Cours à compléter au fil de l'année. Voir aussi la [[Électricité — Fiche mémo]] et la page [Habilitation électrique](/habilitation).*`,
      },
      {
        title: "Électricité — Fiche mémo",
        slug: "electricite-fiche-memo",
        parent: "electricite",
        body: `Révision express avant un contrôle ou un montage. Détails complets : [[Électricité]] et la page [Habilitation électrique](/habilitation).

## Formules clés

| Formule | Usage |
| --- | --- |
| U = R × I | Loi d'Ohm |
| P = U × I | Puissance |
| I = P ÷ U | Intensité à partir de la puissance |
| Monophasé : I = P ÷ 230 | Intensité d'une charge en 230 V |
| Triphasé : I = P ÷ (√3 × 400) | Intensité d'une charge en 400 V triphasé |

## Repères pratiques

- Chute de tension admise : **3 %** éclairage, **5 %** autres usages.
- Calibres de ligne courants : **16, 32, 63, 125 A**.
- Monophasé = 1 phase, 230 V. Triphasé/tétraphasé = 3 phases + neutre, 400 V.

## Habilitation, l'essentiel

- **B0** : non électricien, travaux d'ordre non électrique.
- **BS** : intervention élémentaire (fusible, réarmement).
- **B1V** : exécutant, travaux sous tension basse tension.
- Consignation = **4 étapes** : identification, séparation, condamnation, vérification d'absence de tension (VAT).
- Détails et quiz complet : page [Habilitation électrique](/habilitation).`,
      },
    ],
  },
  {
    key: "lumiere",
    label: "Lumière",
    description: "Une seule page complète : familles de projecteurs, couleur, DMX, positions de lumière, puissance — plus une fiche mémo.",
    pages: [
      {
        title: "Lumière",
        slug: "lumiere",
        body: `## 💡 Introduction

Éclairer un spectacle, ce n'est pas juste « allumer » : c'est choisir le bon projecteur, la bonne couleur, le bon angle, au bon moment. Ce cours pose les bases de la lumière de spectacle — le matériel, la couleur, le pilotage (DMX) et les positions classiques — pour commencer à lire un plan de feux sans paniquer.

## 🔦 Les familles de projecteurs

- **PC (lentille plan-convexe)** : faisceau réglable, bords assez doux. Le classique polyvalent.
- **Fresnel** : lentille à stries, faisceau doux et large, très utilisé en théâtre.
- **Découpe / profile (profil)** : faisceau net, bords francs, couteaux réglables pour détourer précisément une zone. L'outil de précision.
- **PAR (Parabolic Aluminized Reflector)** : faisceau fixe (selon la lampe/lentille installée), compact, puissant, souvent utilisé en rampe ou en douche.
- **Lyre / projecteur asservi (moving head)** : motorisé, pilotable à distance en pan/tilt, couleur et gobos via DMX. Le couteau suisse moderne.

## 🎨 La couleur

- **Gélatine (gel)** : filtre coloré placé devant le projecteur, identifié par une référence de fabricant (Rosco, Lee…).
- **Température de couleur** (en kelvins, K) : plus elle est basse, plus la lumière est chaude (orangée) ; plus elle est haute, plus elle est froide (bleutée). La lumière du jour tourne autour de 5 600 K, une lampe tungstène autour de 3 200 K.
- **Mélange additif** : en lumière, on additionne les couleurs (contrairement à la peinture). Rouge + Vert + Bleu (RVB) donnent du blanc — c'est le principe des lyres et projecteurs LED multicolores.

## 🎛️ Piloter la lumière : le DMX

Le **DMX512** est le protocole historique de contrôle des projecteurs : 512 canaux par **univers**, un câble XLR en série d'appareil en appareil. Chaque projecteur occupe un certain nombre de canaux (son **mode** ou **footprint** : intensité, couleur, pan/tilt, gobo…), à une **adresse** de départ qu'on règle sur le projecteur.

Pour dépasser la limite de 512 canaux et de câblage en série, on transporte aujourd'hui le DMX **sur un réseau Ethernet** via **Art-Net** ou **sACN** : plusieurs dizaines d'univers sur un seul câble réseau, avec des **nœuds (nodes)** qui reconvertissent en sortie DMX classique pour les projecteurs non natifs en réseau. Tout ça est détaillé dans le cours [[Réseaux]] — la calculette **Patch DMX** (Calculettes → Son & lumière) calcule directement combien d'univers et quelles adresses pour une liste de projecteurs.

## 📐 Position et angle de la lumière

Les éclairagistes nomment les positions classiques selon l'angle par rapport au sujet :

- **Face** : de face, depuis la salle — éclaire sans relief, aplatit le visage.
- **Contre (contre-jour)** : depuis derrière le sujet, vers le public — détoure la silhouette, crée de la profondeur.
- **Latérale** : depuis le côté — sculpte le volume, très utilisée en danse.
- **Plongée / contre-plongée** : depuis le dessus ou depuis le dessous — effets dramatiques ou inhabituels.
- **Douche** : faisceau vertical serré, du dessus, qui isole une petite zone au sol.

Une bonne base de travail combine souvent **face + contre** pour donner du volume, puis de la **couleur** et des **latérales** pour l'ambiance.

## 🔋 Puissance et consommation

Chaque projecteur a une puissance en **watts** (quelques dizaines de watts pour une LED, plusieurs centaines pour un gros PAR ou une lyre). Avant un montage, on additionne la puissance de tout le matériel pour savoir quelle alimentation prévoir — exactement ce que fait la calculette **Bilan de puissance** du cours [[Électricité]], et sa calculette associée (Calculettes → Électricité).

## 📖 Petit lexique

- **PC / Fresnel / découpe / PAR / lyre** — les grandes familles de projecteurs (voir plus haut).
- **Gélatine (gel)** — filtre coloré placé devant un projecteur.
- **Température de couleur** — en kelvins ; bas = chaud, haut = froid.
- **Gobo** — plaque découpée insérée dans un projecteur pour projeter une forme ou une texture.
- **Mode / footprint** — nombre de canaux DMX qu'occupe un projecteur.
- **Adresse DMX** — numéro du premier canal occupé par un projecteur dans son univers.
- **Univers DMX** — 512 canaux, la capacité d'une ligne DMX.
- **Face / contre / latérale / douche** — positions classiques de la lumière par rapport au sujet.
- **Plan de feux** — document qui recense tous les projecteurs d'un spectacle, leur position et leur réglage.

## 🧠 Quiz éclair

**1.** Quel projecteur choisir pour détourer précisément une zone avec des bords nets ?
💡 *Réponse : la découpe (profile), grâce à ses couteaux réglables.*

**2.** En lumière, que donne un mélange de rouge, vert et bleu à pleine intensité ?
💡 *Réponse : du blanc (mélange additif, contrairement à la peinture).*

**3.** Pourquoi passer le DMX sur un réseau Ethernet (Art-Net/sACN) plutôt qu'en câblage XLR classique ?
💡 *Réponse : pour dépasser la limite de 512 canaux par câble et transporter plusieurs univers sur un seul câble réseau.*

*Cours à compléter au fil de l'année. Voir aussi la [[Lumière — Fiche mémo]].*`,
      },
      {
        title: "Lumière — Fiche mémo",
        slug: "lumiere-fiche-memo",
        parent: "lumiere",
        body: `Révision express avant un contrôle ou un montage. Détails complets : [[Lumière]].

## Projecteurs en un coup d'œil

| Type | Faisceau | Usage typique |
| --- | --- | --- |
| PC | Réglable, bords doux | Polyvalent |
| Fresnel | Doux et large | Théâtre |
| Découpe (profile) | Net, bords francs | Détourage précis |
| PAR | Fixe, puissant | Rampe, douche |
| Lyre (moving head) | Motorisé, tout en DMX | Spectacle moderne |

## Positions de lumière

Face · Contre · Latérale · Plongée/contre-plongée · Douche — combiner face + contre pour le volume, puis couleur + latérales pour l'ambiance.

## DMX express

- 1 univers = **512 canaux**.
- Chaque projecteur occupe un **mode** (nombre de canaux) à une **adresse** de départ.
- Au-delà d'un câble : **Art-Net / sACN** sur réseau Ethernet (voir [[Réseaux]]).

## Couleur express

- Température basse (≈ 3 200 K) = chaud. Température haute (≈ 5 600 K+) = froid.
- Mélange **additif** : Rouge + Vert + Bleu = blanc.`,
      },
    ],
  },
];
