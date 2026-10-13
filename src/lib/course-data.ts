// Contenu des « cours » importables dans le wiki (catégorie « Cours »), sur le même principe que le guide de rentrée
// (src/lib/guide-data.ts) : une liste de pages, importées une fois par un admin, puis éditables normalement dans le
// wiki (texte, historique, sous-pages). Ajouter un nouveau cours = ajouter une entrée ici, avec sa propre page
// « parent » et ses sous-pages ; il apparaît alors tout seul dans la liste d'import de la page Administration.

export type CoursePage = { title: string; slug: string; parent?: string; body: string };
export type Course = { key: string; label: string; description: string; pages: CoursePage[] };

export const COURSES: Course[] = [
  {
    key: "reseaux",
    label: "Réseaux — Notions de base",
    description: "Introduction aux réseaux informatiques : histoire, vocabulaire, PAN/LAN/MAN/WAN, adresses MAC/IP/IPv4/IPv6, Dante et Art-Net, glossaire.",
    pages: [
      {
        title: "Réseaux — Notions de base",
        slug: "reseaux-notions-de-base",
        body: `## Introduction

Un **réseau informatique** est un ensemble d'appareils (ordinateurs, téléphones, consoles lumière, interfaces audio…) reliés entre eux pour **échanger des données** : fichiers, pages web, son, DMX, etc.

Pour un régisseur technique, comprendre les réseaux n'est plus optionnel : la lumière (Art-Net, sACN), le son (Dante, AES67, AVB) et la vidéo (NDI) passent de plus en plus **par des câbles réseau plutôt que par des câbles dédiés**. Un seul câble Ethernet bien configuré peut remplacer des dizaines de câbles DMX ou audio.

Ce cours pose les bases avant d'aller plus loin : un peu d'histoire, le vocabulaire indispensable, les tailles de réseaux, puis Dante et Art-Net en pratique.

## Sommaire

- [[Histoire des réseaux et d'Internet]]
- [[Bit, octet et débit]]
- [[Tailles de réseaux : PAN, LAN, MAN, WAN]]
- [[Adressage : MAC, IP, IPv4 et IPv6]]
- [[Le réseau local : LAN, switch, routeur]]
- [[Dante et Art-Net : l'audio et la lumière en réseau]]
- [[Glossaire réseaux]]

## L'essentiel à retenir

- Un réseau sert à faire circuler des **données** entre des **appareils** (appelés « hôtes » ou « nœuds »).
- Les données circulent en **bits** (0 ou 1), regroupés en **octets**, eux-mêmes regroupés en **trames** et **paquets**.
- La taille d'un réseau (du plus petit au plus grand) : **PAN → LAN → MAN → WAN**. Internet est le plus grand WAN qui existe : le « réseau des réseaux ».
- En régie, deux protocoles réseau à connaître absolument : **Dante** (audio) et **Art-Net** (lumière, DMX).

*Cours à compléter au fil de l'année.*`,
      },
      {
        title: "Histoire des réseaux et d'Internet",
        slug: "histoire-des-reseaux-et-dinternet",
        parent: "reseaux-notions-de-base",
        body: `## Avant les réseaux

Dans les années 1950-1960, les ordinateurs sont énormes, coûteux et **isolés les uns des autres** : pour échanger des données, il faut déplacer des bandes magnétiques ou des cartes perforées physiquement.

## ARPANET (1969) : l'ancêtre d'Internet

**ARPANET** (*Advanced Research Projects Agency Network*) est financé par le département de la Défense américain. Le **29 octobre 1969**, le premier message est envoyé entre deux ordinateurs (UCLA et Stanford) : l'objectif est d'essayer de transmettre le mot **« LOGIN »**, mais le système plante après les deux premières lettres **« LO »** — c'est tout de même la naissance du réseau.

ARPANET relie d'abord 4 universités américaines. Son idée fondatrice : un réseau **décentralisé**, sans point central, capable de continuer à fonctionner même si une partie est détruite (contexte de guerre froide).

## L'invention du LAN (réseau local)

Dans les années 1970, **Ethernet** est inventé par Robert Metcalfe (Xerox PARC, 1973) : une technologie pour relier des ordinateurs **proches les uns des autres**, dans un même bâtiment. C'est la naissance du **LAN** (*Local Area Network*), bien plus rapide qu'un lien longue distance.

## TCP/IP et la naissance d'Internet (1983)

Le **1er janvier 1983** (le « *flag day* »), ARPANET bascule sur le protocole **TCP/IP**, encore utilisé aujourd'hui par tous les réseaux du monde, y compris Internet. C'est ce standard commun qui permet à des réseaux différents de se parler entre eux : Internet est littéralement un réseau **de réseaux**.

## Le Minitel (France, 1982)

En France, avant qu'Internet soit grand public, le **Minitel** (lancé en 1982 par France Télécom) permet déjà de consulter des services en ligne (annuaire, messagerie, réservations) via le réseau téléphonique. Il restera en service jusqu'en **2012**.

## Le Web (1989-1991)

Le **World Wide Web** (le « web », les pages consultées avec un navigateur) est inventé par **Tim Berners-Lee** au CERN en 1989, et devient public en 1991. Attention : **le Web n'est pas Internet** — Internet est l'infrastructure (les câbles, les protocoles), le Web est un **service** qui tourne dessus, au même titre que l'e-mail ou le streaming.

## Le modem 56K et l'arrivée du grand public (années 1990)

Pour se connecter à Internet depuis chez soi, il faut un **modem** (modulateur-démodulateur) qui transforme les données numériques en signal transmissible sur une ligne téléphonique classique (RTC, réseau téléphonique commuté). Le modem **56K** (56 kilobits par seconde, soit environ 7 Ko/s dans le meilleur des cas) est le standard des années 1990 :

- La ligne téléphonique est **monopolisée** : impossible de téléphoner et d'être connecté en même temps.
- La connexion se fait en **composant un numéro** : on entend le fameux bruit de négociation du modem.
- À cette vitesse, charger une simple photo peut prendre plusieurs dizaines de secondes.

## L'ADSL puis la fibre

L'**ADSL** (fin des années 1990-2000) utilise aussi la ligne téléphonique, mais sur des fréquences différentes du téléphone : la ligne reste libre, et les débits grimpent à plusieurs **mégabits** par seconde (jusqu'à 1 000 fois plus vite qu'un modem 56K dans les meilleurs cas). La **fibre optique** (généralisée en France dans les années 2010-2020) utilise la lumière plutôt que l'électricité et permet des débits de plusieurs centaines de Mb/s, voire du gigabit.

## Et le sans-fil

Le **Wi-Fi** (fin des années 1990) permet de se passer de câble sur de courtes distances. La téléphonie mobile passe de la 2G (SMS, appels) à la 3G (Internet mobile basique), puis à la **4G** et la **5G**, qui rivalisent aujourd'hui avec une connexion filaire.

## Frise résumée

| Période | Évènement |
| --- | --- |
| 1969 | Premier message sur ARPANET |
| 1973 | Invention d'Ethernet (LAN) |
| 1982 | Minitel (France) |
| 1983 | Adoption de TCP/IP : naissance d'Internet tel qu'on le connaît |
| 1989-1991 | Invention puis ouverture au public du World Wide Web |
| Années 1990 | Démocratisation du modem 56K, premiers Internautes grand public |
| Fin 1990s-2000s | ADSL |
| 2000s | Wi-Fi, 3G |
| 2010s-2020s | Fibre optique, 4G puis 5G |`,
      },
      {
        title: "Bit, octet et débit",
        slug: "bit-octet-et-debit",
        parent: "reseaux-notions-de-base",
        body: `## Le bit, unité de base

Un ordinateur ne comprend que deux états : **0** ou **1**. Chacun de ces états s'appelle un **bit** (*binary digit*, chiffre binaire). C'est la plus petite unité d'information possible.

## L'octet

Un **octet** (en anglais *byte*) regroupe **8 bits**. Avec 8 bits, on peut coder 2⁸ = **256 valeurs différentes** (de 0 à 255) : c'est par exemple ce qui permet de coder un caractère de texte simple, ou une composante de couleur (rouge, vert ou bleu, de 0 à 255).

\`\`\`
1 octet = 8 bits
1 bit   = 0 ou 1
\`\`\`

## Les multiples : attention aux pièges

On utilise des préfixes pour les grands nombres, mais il existe **deux conventions** qui se ressemblent et prêtent à confusion :

| Préfixe décimal (réseaux, disques durs) | Préfixe binaire (mémoire, informatique) |
| --- | --- |
| 1 Ko (kilooctet) = 1 000 octets | 1 Kio (kibioctet) = 1 024 octets |
| 1 Mo (mégaoctet) = 1 000 000 octets | 1 Mio (mébioctet) = 1 048 576 octets |
| 1 Go (gigaoctet) = 1 000 000 000 octets | 1 Gio (gibioctet) = 1 073 741 824 octets |

Dans la pratique courante (et dans ce cours), on parle surtout de **Ko, Mo, Go** au sens décimal — c'est ce qu'utilisent les constructeurs et les fournisseurs d'accès. C'est aussi pour cette raison qu'un disque dur « 1 To » affiche un peu moins que 1 000 Go une fois branché à un ordinateur (qui, lui, compte souvent en binaire).

## Bit ou octet : le piège du débit

C'est **la confusion la plus fréquente** en réseau :

- Les **débits réseau** (vitesse d'une connexion Internet, d'un câble Ethernet, d'un Wi-Fi…) s'expriment en **bits par seconde** : **b/s**, **Kb/s**, **Mb/s**, **Gb/s** (avec un petit **b** minuscule).
- Les **tailles de fichiers et les vitesses de transfert** affichées par un ordinateur s'expriment en **octets par seconde** : **o/s**, **Ko/s**, **Mo/s** (avec un grand **O**, ou **B** majuscule en anglais : KB/s, MB/s).

**1 octet = 8 bits**, donc pour convertir, on **divise par 8** :

> Une connexion annoncée à **100 Mb/s** (mégabits par seconde) ne télécharge donc, au mieux, qu'à environ **12,5 Mo/s** (mégaoctets par seconde) — et non 100 Mo/s !

C'est pour ça qu'un abonnement Internet « 1 Gb/s » ne permet pas de télécharger un fichier à 1 Go par seconde, mais plutôt autour de 125 Mo/s dans le meilleur des cas.

## Débit et bande passante

- Le **débit** est la quantité de données réellement transmise par seconde.
- La **bande passante** est la capacité maximale théorique d'un lien (souvent utilisée comme synonyme du débit maximal).

En régie, ces notions comptent directement : un flux audio Dante multicanal ou un flux vidéo NDI consomment une bande passante importante, qu'il faut dimensionner (câblage, switch) en conséquence.`,
      },
      {
        title: "Tailles de réseaux : PAN, LAN, MAN, WAN",
        slug: "tailles-de-reseaux-pan-lan-man-wan",
        parent: "reseaux-notions-de-base",
        body: `On classe les réseaux selon leur **étendue géographique**, du plus petit au plus grand.

## PAN — Personal Area Network (réseau personnel)

Un réseau à l'échelle **d'une personne**, sur quelques mètres : une montre connectée reliée à un téléphone en Bluetooth, un casque sans fil, une souris Bluetooth. Portée : **quelques mètres**.

## LAN — Local Area Network (réseau local)

Un réseau à l'échelle **d'un bâtiment ou d'un site** : le réseau d'une maison, d'un bureau, d'une salle de spectacle, d'une régie. C'est le réseau que l'on câble soi-même avec des switchs, des routeurs et des câbles Ethernet (ou en Wi-Fi). Portée : de quelques mètres à **quelques centaines de mètres**. C'est le type de réseau le plus manipulé en régie technique (voir [[Le réseau local : LAN, switch, routeur]]).

## MAN — Metropolitan Area Network (réseau métropolitain)

Un réseau à l'échelle **d'une ville** : il relie plusieurs LAN entre eux (plusieurs bâtiments d'une même entreprise ou d'un même campus dans une ville, le réseau de fibre d'une collectivité). Portée : quelques kilomètres à **quelques dizaines de kilomètres**.

## WAN — Wide Area Network (réseau étendu)

Un réseau à l'échelle **d'un pays, d'un continent, ou du monde entier** : il relie des MAN et des LAN entre eux sur de longues distances, via les infrastructures des opérateurs télécoms (câbles sous-marins, satellites, fibres longue distance). Portée : illimitée.

> **Internet est le plus grand WAN qui existe** : il relie entre eux la quasi-totalité des réseaux du monde (des LAN domestiques aux datacenters), via le protocole commun **TCP/IP**.

## Tableau récapitulatif

| Type | Étendue | Exemple |
| --- | --- | --- |
| **PAN** | Quelques mètres | Casque Bluetooth, montre connectée |
| **LAN** | Un bâtiment, un site | Le réseau d'une salle de spectacle, d'un bureau |
| **MAN** | Une ville | Le réseau fibre d'une métropole |
| **WAN** | Un pays, le monde | Internet, le réseau d'une entreprise multi-sites |`,
      },
      {
        title: "Adressage : MAC, IP, IPv4 et IPv6",
        slug: "adressage-mac-ip-ipv4-ipv6",
        parent: "reseaux-notions-de-base",
        body: `Chaque appareil sur un réseau a besoin d'être identifié pour qu'on puisse lui envoyer des données. Il existe en fait **deux adresses différentes** pour un même appareil : l'adresse **MAC** et l'adresse **IP**. Elles ne jouent pas du tout le même rôle.

## L'adresse MAC : l'identité physique

L'**adresse MAC** (*Media Access Control*) est un identifiant **gravé en usine** dans la carte réseau (Ethernet ou Wi-Fi) de l'appareil. Elle s'écrit en **6 octets en hexadécimal**, séparés par des deux-points ou des tirets :

\`\`\`
00:1A:2B:3C:4D:5E
\`\`\`

- Elle est en théorie **unique au monde** : les 3 premiers octets identifient le fabricant de la carte réseau, les 3 suivants l'appareil.
- Elle **ne change jamais** (sauf trucage volontaire), quel que soit le réseau auquel l'appareil se connecte.
- Elle ne sert qu'à l'intérieur d'un **même réseau local** : un switch l'utilise pour savoir sur quel port envoyer une trame ([[Le réseau local : LAN, switch, routeur]]), mais une adresse MAC **ne traverse jamais un routeur**.
- Niveau concerné : la couche **liaison** (Ethernet).

## L'adresse IP : l'identité logique

L'**adresse IP** (*Internet Protocol*) est un identifiant **logique**, attribué à l'appareil (automatiquement par DHCP, ou manuellement). Elle sert à faire circuler les données **entre réseaux différents**, via les routeurs.

- Elle **change** selon le réseau auquel l'appareil se connecte (le Wi-Fi de l'école, celui de la maison, un réseau 4G…).
- C'est elle qui permet le **routage** : faire voyager une donnée d'un réseau à un autre, jusqu'à l'autre bout d'Internet si besoin.
- Niveau concerné : la couche **réseau**.

## MAC et IP, côte à côte

| | Adresse MAC | Adresse IP |
| --- | --- | --- |
| Attribuée par | Le fabricant (gravée) | Le réseau (DHCP) ou à la main |
| Change si on change de réseau ? | Non, fixe | Oui |
| Utilisée par | Le switch (dans le LAN) | Le routeur (entre réseaux) |
| Format | 6 octets en hexadécimal | 4 octets (IPv4) ou 16 octets (IPv6) |
| Exemple | \`00:1A:2B:3C:4D:5E\` | \`192.168.1.42\` |

## IPv4 : la version historique

L'**IPv4** est la version d'adresse IP la plus utilisée aujourd'hui. Elle s'écrit sur **4 octets** (32 bits), en décimal, séparés par des points :

\`\`\`
192.168.1.42
\`\`\`

Chaque octet va de **0 à 255**. Avec 32 bits, il existe 2³² ≈ **4,3 milliards d'adresses IPv4 possibles** — ce qui paraissait énorme dans les années 1980, mais s'avère **insuffisant** face au nombre d'appareils connectés aujourd'hui (ordinateurs, téléphones, objets connectés…) : c'est l'**épuisement des adresses IPv4**.

Deux types d'adresses IPv4 :

- **Adresses privées** : réservées aux réseaux locaux, jamais routées sur Internet (ex. \`192.168.0.0\` à \`192.168.255.255\`, \`10.0.0.0\` à \`10.255.255.255\`, \`172.16.0.0\` à \`172.31.255.255\`). Plusieurs réseaux différents peuvent réutiliser les mêmes adresses privées sans conflit.
- **Adresses publiques** : uniques sur Internet, attribuées par les fournisseurs d'accès. C'est l'adresse que voit le reste d'Internet (le routeur fait la conversion entre adresse privée et publique, voir [[Le réseau local : LAN, switch, routeur]]).

## IPv6 : la relève

L'**IPv6** a été créé pour résoudre le manque d'adresses IPv4. Elle s'écrit sur **16 octets** (128 bits), en hexadécimal, en 8 groupes séparés par des deux-points :

\`\`\`
2001:0db8:85a3:0000:0000:8a2e:0370:7334
\`\`\`

- Nombre d'adresses possibles : 2¹²⁸, un nombre astronomique (environ 340 **undécillions**, soit 340 suivi de 36 zéros) — de quoi donner une adresse à chaque grain de sable sur Terre, plusieurs fois.
- Une écriture raccourcie existe : les zéros non significatifs peuvent être omis, et une seule série de groupes de zéros consécutifs peut être remplacée par \`::\` (une seule fois dans l'adresse). L'exemple ci-dessus peut s'écrire \`2001:db8:85a3::8a2e:370:7334\`.
- IPv4 et IPv6 **coexistent** aujourd'hui (on parle de « double pile », *dual stack* ) : la plupart des réseaux et appareils gèrent les deux en même temps, le temps que la transition se termine.

## IPv4 ou IPv6 ?

| | IPv4 | IPv6 |
| --- | --- | --- |
| Taille de l'adresse | 32 bits (4 octets) | 128 bits (16 octets) |
| Écriture | Décimal, points (\`192.168.1.42\`) | Hexadécimal, deux-points (\`2001:db8::1\`) |
| Nombre d'adresses | ≈ 4,3 milliards | ≈ 340 undécillions |
| Statut | Historique, encore très utilisée | En déploiement progressif |`,
      },
      {
        title: "Le réseau local : LAN, switch, routeur",
        slug: "le-reseau-local-lan-switch-routeur",
        parent: "reseaux-notions-de-base",
        body: `## Les câbles et connecteurs

Le câblage le plus courant d'un LAN filaire est le câble **Ethernet**, terminé par une fiche **RJ45**. Plusieurs catégories existent, avec des débits et distances garanties différentes :

| Catégorie | Débit max | Usage typique |
| --- | --- | --- |
| Cat 5e | 1 Gb/s | Suffisant pour la plupart des usages (dont Dante en petite config) |
| Cat 6 | 1 à 10 Gb/s (selon distance) | Recommandé pour les installations neuves |
| Cat 6a | 10 Gb/s | Réseaux exigeants, vidéo HD/4K sur IP |

## Les équipements

### Le hub (concentrateur) — obsolète

Un **hub** relie plusieurs appareils mais **répète aveuglément** toutes les données reçues vers **tous** les ports, sans distinction. Il sature vite le réseau et crée des collisions. Il n'est quasiment plus utilisé aujourd'hui.

### Le switch (commutateur)

Un **switch** relie plusieurs appareils d'un même LAN, mais contrairement au hub, il est **intelligent** : il apprend l'**adresse MAC** (l'identifiant physique unique) de chaque appareil connecté à chacun de ses ports, et n'envoie les données **qu'au bon port de destination**. C'est l'équipement central de tout réseau local filaire, y compris en régie (réseau Dante, Art-Net, NDI...).

- **Switch non managé** : plug-and-play, aucune configuration possible. Suffisant pour un petit réseau simple.
- **Switch managé (manageable)** : configurable (VLAN, priorité QoS, surveillance du trafic...). Recommandé dès qu'on mélange plusieurs usages (audio + lumière + informatique) sur le même réseau, pour les séparer proprement avec des **VLAN** et garantir la priorité au trafic sensible (comme l'audio Dante).

### Le routeur

Un **routeur** relie des réseaux **différents** entre eux — typiquement, il relie le LAN local à un autre réseau (souvent Internet, via la « box » du fournisseur d'accès). C'est l'équipement qui fait le lien entre le monde « dedans » (le réseau local) et le monde « dehors » (le WAN, Internet).

**Son rôle en détail :**

- **Router les paquets** : il regarde l'adresse IP de destination de chaque paquet et décide par quel chemin le faire passer pour qu'il arrive à bon port, y compris à travers plusieurs réseaux intermédiaires. C'est de là que vient son nom.
- **Faire la passerelle (gateway)** : c'est par lui que transite toute donnée qui doit sortir du réseau local — c'est pour ça qu'on l'appelle aussi « passerelle par défaut ».
- **Distribuer les adresses IP** : via **DHCP**, il attribue automatiquement une adresse IP locale à chaque appareil qui se connecte, pour éviter d'avoir à les configurer à la main.
- **Traduire les adresses (NAT)** : les appareils du LAN ont des adresses IP **privées** (voir [[Adressage : MAC, IP, IPv4 et IPv6]]), invisibles depuis Internet. Le routeur fait la traduction entre ces adresses privées et sa propre adresse IP **publique** à chaque fois qu'un appareil du réseau communique vers l'extérieur — cette technique s'appelle le **NAT** (*Network Address Translation*). C'est aussi ce qui protège un peu le réseau local : personne depuis Internet ne peut joindre directement un appareil derrière le NAT sans configuration particulière.
- **Filtrer le trafic** : beaucoup de routeurs embarquent un pare-feu (firewall) basique, qui bloque par défaut les connexions non sollicitées venant de l'extérieur.

> **En résumé** : le **switch** fait communiquer les appareils **entre eux, à l'intérieur** d'un même réseau local (adresses MAC) ; le **routeur** fait communiquer des réseaux **différents entre eux** (adresses IP), typiquement le LAN vers le WAN/Internet.

## Adresse IP, masque, passerelle (les bases)

- **Adresse IP** : l'identifiant numérique d'un appareil sur un réseau (ex. \`192.168.1.42\`). Deux appareils d'un même réseau ne peuvent pas avoir la même adresse IP en même temps.
- **Masque de sous-réseau** : définit quelle partie de l'adresse IP désigne le réseau, et quelle partie désigne l'appareil (ex. \`255.255.255.0\`).
- **Passerelle (gateway)** : l'adresse IP de l'équipement (en général le routeur) par lequel transitent les données qui sortent du réseau local.

## Topologie en étoile

Le LAN moderne utilise presque toujours une **topologie en étoile** : chaque appareil est relié par son propre câble à un switch central (et éventuellement plusieurs switchs reliés en cascade ou en étoile entre eux). Si un câble tombe en panne, seul l'appareil concerné est affecté — le reste du réseau continue de fonctionner.`,
      },
      {
        title: "Dante et Art-Net : l'audio et la lumière en réseau",
        slug: "dante-et-artnet",
        parent: "reseaux-notions-de-base",
        body: `Deux protocoles **à connaître absolument** en régie technique : **Dante** pour l'audio, **Art-Net** pour la lumière. Tous les deux font circuler des signaux techniques (son ou DMX) **sur un réseau Ethernet standard**, à la place de câbles analogiques ou DMX dédiés.

## Dante (audio sur IP)

**Dante** (*Digital Audio Network Through Ethernet*) est un protocole développé par la société australienne **Audinate**. Il permet de transporter un **très grand nombre de canaux audio numériques** (plusieurs centaines) sur un simple câble Ethernet, avec une qualité et une synchronisation professionnelles.

**Ce qu'il faut savoir :**

- Fonctionne sur un réseau Ethernet **Gigabit** (1 Gb/s) recommandé, standard **100Base** possible pour de petites configurations.
- Chaque appareil Dante (console, interface, enceinte active...) a sa propre **adresse IP** sur le réseau.
- Le logiciel gratuit **Dante Controller** permet de visualiser tous les appareils Dante du réseau et de router (« patcher ») les canaux audio entre eux, à la souris.
- La **latence** est très faible et réglable (de l'ordre de la milliseconde), ce qui le rend utilisable en live.
- Compatible avec le standard ouvert **AES67**, ce qui permet l'interopérabilité avec d'autres systèmes audio-sur-IP.
- **Bonnes pratiques réseau** : utiliser un switch **Gigabit**, de préférence managé, dédier un **VLAN** séparé au trafic Dante si le réseau est partagé avec d'autres usages, éviter le Wi-Fi pour le Dante (toujours en filaire), et activer **QoS** si le switch le permet pour prioriser le trafic Dante.

## Art-Net (DMX sur Ethernet)

Le **DMX512** (DMX) est le protocole historique de contrôle des projecteurs et gradateurs en éclairage scénique, mais il est limité à **512 circuits (canaux)** par ligne (un « univers »), et aux câbles XLR en série. **Art-Net** résout ces limites en transportant un ou plusieurs **univers DMX sur un réseau Ethernet standard**, via le protocole IP.

**Ce qu'il faut savoir :**

- Chaque **univers Art-Net** correspond à un univers DMX classique (512 canaux).
- Un seul câble réseau et un switch peuvent transporter **plusieurs dizaines d'univers** simultanément — impossible avec du DMX câblé classique.
- Art-Net fonctionne historiquement en **broadcast/multicast** : les paquets sont envoyés à tous les appareils du réseau (ou à un groupe), ce qui peut surcharger un réseau mal dimensionné si on ne filtre pas correctement (d'où l'intérêt d'un switch managé et de VLAN dédiés).
- Un **nœud Art-Net (node)** convertit le signal Ethernet en sortie DMX classique (XLR) pour piloter les projecteurs qui ne sont pas nativement en réseau.
- Il existe un protocole concurrent, **sACN (streaming ACN, norme E1.31)**, plus récent, qui répond aux mêmes besoins avec une gestion réseau un peu plus propre (moins de broadcast). De nombreuses consoles lumière gèrent les deux protocoles.

## Dante et Art-Net sur le même réseau ?

Techniquement possible, mais **déconseillé sans précaution** : mélanger de l'audio temps réel (Dante) et de la lumière (Art-Net, souvent en broadcast) sur le même réseau non segmenté peut créer des perturbations des deux côtés. La bonne pratique en régie est de **séparer les usages** avec des **VLAN** sur un switch managé, ou d'utiliser des réseaux physiquement distincts quand c'est possible.`,
      },
      {
        title: "Glossaire réseaux",
        slug: "glossaire-reseaux",
        parent: "reseaux-notions-de-base",
        body: `| Terme | Définition |
| --- | --- |
| **Adresse IP** | Identifiant numérique d'un appareil sur un réseau (ex. \`192.168.1.42\`). |
| **Adresse MAC** | Identifiant physique unique, gravé dans chaque carte réseau. |
| **Adresse privée** | Adresse IP valable uniquement à l'intérieur d'un réseau local, jamais routée sur Internet. |
| **Adresse publique** | Adresse IP unique sur Internet, attribuée par le fournisseur d'accès. |
| **AES67** | Standard ouvert d'audio-sur-IP, interopérable avec Dante. |
| **ARPANET** | Premier réseau à grande échelle (1969), ancêtre d'Internet. |
| **Art-Net** | Protocole qui transporte le DMX (lumière) sur un réseau Ethernet. |
| **Bande passante** | Capacité maximale théorique d'un lien réseau. |
| **Bit** | Plus petite unité d'information (0 ou 1). |
| **Câble RJ45** | Connecteur standard des câbles Ethernet. |
| **Dante** | Protocole d'audio numérique multicanal sur Ethernet (Audinate). |
| **Débit** | Quantité de données réellement transmise par seconde. |
| **DHCP** | Service qui attribue automatiquement une adresse IP à un appareil. |
| **DMX512 (DMX)** | Protocole historique de contrôle des projecteurs lumière (512 canaux par univers). |
| **DNS** | Service qui traduit un nom de domaine (ex. google.com) en adresse IP. |
| **Ethernet** | Technologie de réseau local filaire, inventée en 1973. |
| **Fibre optique** | Câble qui transmet les données sous forme de lumière, à très haut débit. |
| **FAI** | Fournisseur d'Accès à Internet (ex. Orange, Free, SFR). |
| **Firewall (pare-feu)** | Système qui filtre le trafic réseau entrant/sortant pour la sécurité. |
| **Gateway (passerelle)** | Équipement (souvent le routeur) par lequel sortent les données du réseau local. |
| **Hub (concentrateur)** | Ancien équipement qui répète les données vers tous ses ports, sans intelligence. |
| **IP (protocole)** | Protocole qui adresse et achemine les paquets de données entre réseaux. |
| **IPv4** | Version d'adresse IP la plus répandue, sur 32 bits (ex. \`192.168.1.42\`) : environ 4,3 milliards d'adresses possibles. |
| **IPv6** | Version d'adresse IP plus récente, sur 128 bits (ex. \`2001:db8::1\`), créée pour pallier le manque d'adresses IPv4. |
| **LAN** | *Local Area Network* : réseau local (un bâtiment, un site). |
| **Latence** | Délai de transmission d'une donnée d'un point à un autre. |
| **MAN** | *Metropolitan Area Network* : réseau à l'échelle d'une ville. |
| **Masque de sous-réseau** | Indique quelle partie d'une adresse IP désigne le réseau. |
| **Modem** | Appareil qui convertit un signal numérique en signal transmissible (ligne téléphonique, etc.). |
| **NAT** (*Network Address Translation*) | Traduction entre les adresses IP privées d'un LAN et l'adresse IP publique du routeur. |
| **NDI** | Protocole de transport vidéo sur réseau IP. |
| **Octet** | Groupe de 8 bits (256 valeurs possibles). |
| **PAN** | *Personal Area Network* : réseau à l'échelle d'une personne (Bluetooth...). |
| **Paquet** | Unité de données transmise sur un réseau IP. |
| **Port** | Numéro qui identifie un service précis sur un appareil (ex. port 80 pour le web). |
| **Protocole** | Ensemble de règles communes qui permettent à des appareils de se comprendre. |
| **QoS** (*Quality of Service*) | Mécanisme qui priorise certains flux réseau (ex. l'audio) sur d'autres. |
| **Routeur** | Équipement qui relie des réseaux différents entre eux (ex. le LAN à Internet). |
| **sACN (E1.31)** | Protocole concurrent d'Art-Net pour transporter du DMX sur Ethernet. |
| **Switch (commutateur)** | Équipement qui relie plusieurs appareils d'un même LAN, de façon intelligente. |
| **TCP/IP** | Ensemble de protocoles de base d'Internet, adopté en 1983. |
| **Trame** | Unité de données au niveau le plus bas d'un réseau local (Ethernet). |
| **VLAN** | Réseau local virtuel : permet de séparer logiquement plusieurs réseaux sur un même switch. |
| **WAN** | *Wide Area Network* : réseau à grande échelle (un pays, le monde). Internet est le plus grand WAN. |
| **Wi-Fi** | Technologie de réseau local sans fil. |`,
      },
    ],
  },
];
