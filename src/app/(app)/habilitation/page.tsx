import Link from "next/link";
import { AlertTriangle, Calculator, ShieldCheck, Zap } from "lucide-react";
import { ElectricalSymbols } from "@/components/ElectricalSymbols";
import { QuizLoader } from "@/components/QuizLoader";

export const metadata = { title: "Habilitation électrique" };

// Fiche de référence électricité / habilitation, reprise du cours (NFC 18-510) : formules, dangers, disjoncteurs, IP,
// classes de matériel, habilitations, EPI et la procédure de consignation en 5 étapes. Contenu statique (pas de base de données).

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Zap; children: React.ReactNode }) {
  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon size={18} className="text-accent" aria-hidden /> {title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-line text-muted">{head.map((h) => <th key={h} className="py-1.5 pr-4 font-medium">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-line/60">{r.map((c, j) => <td key={j} className="py-1.5 pr-4">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const DANGER = [
  { ma: "5 mA", effet: "Picotement, fourmillement", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { ma: "10 mA", effet: "Tétanie musculaire (on ne peut plus lâcher)", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { ma: "30 mA", effet: "Paralysie pulmonaire — seuil du différentiel", cls: "bg-amber-500/25 text-amber-700 dark:text-amber-400" },
  { ma: "70 mA", effet: "Mort possible en 60 secondes", cls: "bg-danger/20 text-danger" },
  { ma: "1 A", effet: "Arrêt du cœur", cls: "bg-danger/30 text-danger" },
  { ma: "2 A", effet: "Mort", cls: "bg-danger/40 text-danger" },
];

export default function HabilitationPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Habilitation électrique</h1>
        <p className="text-sm text-muted">Fiche de référence du cours : formules, dangers, disjoncteurs, IP, classes, habilitations (NFC 18-510) et la procédure de consignation.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 max-w-3xl space-y-6">

      <Card title="Les formules de base" icon={Zap}>
        <p className="text-sm text-muted">Loi d&apos;Ohm et puissance, pour tout relier : tension U (V), intensité I (A), puissance P (W), résistance R (Ω).</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-bg p-3 text-center"><div className="text-xs text-muted">Puissance</div><div className="text-xl font-bold">P = U × I</div></div>
          <div className="rounded-xl border border-line bg-bg p-3 text-center"><div className="text-xs text-muted">Intensité</div><div className="text-xl font-bold">I = P ÷ U</div></div>
          <div className="rounded-xl border border-line bg-bg p-3 text-center"><div className="text-xs text-muted">Résistance (loi d&apos;Ohm)</div><div className="text-xl font-bold">R = U ÷ I</div></div>
        </div>
        <p className="text-xs text-muted">1 kW ≈ 4,3 A en monophasé 230 V. Tension entre phase et neutre : 230 V. Entre deux phases (tétraphasé) : 400 V.</p>
        <Link href="/calculettes" className="btn-ghost w-fit text-sm"><Calculator size={15} aria-hidden /> Calculer avec ces formules</Link>
      </Card>

      <Card title="Dangers du courant pour le corps" icon={AlertTriangle}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DANGER.map((d) => (
            <li key={d.ma} className={`flex items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-sm ${d.cls}`}>
              <span className="font-bold tabular-nums">{d.ma}</span>
              <span className="text-right">{d.effet}</span>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-muted">Conductibilité du corps humain : danger à partir de <strong className="text-fg">50 V en milieu sec</strong>, et dès <strong className="text-fg">25 V en milieu humide</strong>.</p>
          <p className="text-sm text-muted">Domaines de tension : <strong className="text-fg">TBT</strong> 0–50 V · <strong className="text-fg">BT</strong> 50–1 000 V · <strong className="text-fg">HT</strong> au-delà de 1 000 V.</p>
        </div>
      </Card>

      <Card title="Disjoncteurs" icon={ShieldCheck}>
        <Table
          head={["Type", "Protège", "Déclenche"]}
          rows={[
            ["Différentiel", "L'humain (la fuite de courant vers la terre)", "Au-delà de 30 mA de fuite"],
            ["Magnétothermique", "L'installation (court-circuit, surconsommation)", "Au-delà du calibre, ex. 16 A"],
            ["Disjoncteur diff.", "Les deux à la fois", "30 mA et surintensité"],
          ]}
        />
      </Card>

      <Card title="Couleurs des phases" icon={Zap}>
        <p className="text-sm text-muted">Code couleur normalisé (NF C 15-100) des conducteurs, en tétraphasé (3 phases + neutre + terre).</p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Phase 1 (L1)", color: "#7a4a2a" },
            { label: "Phase 2 (L2)", color: "#1a1a1a" },
            { label: "Phase 3 (L3)", color: "#8a8a8a" },
            { label: "Neutre (N)", color: "#1e6fd9" },
            { label: "Terre (PE)", color: "linear-gradient(135deg, #2e9e3f 50%, #e8c200 50%)" },
          ].map((p) => (
            <li key={p.label} className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm">
              <span className="size-4 shrink-0 rounded-full border border-line/60" style={{ background: p.color }} aria-hidden />
              {p.label}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Marron, noir et gris pour les trois phases ; bleu pour le neutre ; vert et jaune (toujours les deux ensemble) pour la terre, jamais utilisée pour autre chose.</p>
      </Card>

      <Card title="Correspondance calibre ↔ section de câble" icon={Zap}>
        <Table head={["Calibre", "Section minimale"]} rows={[["16 A", "2,5 mm²"], ["32 A", "6 mm²"], ["63 A", "16 mm²"], ["125 A", "25 mm²"]]} />
        <p className="text-xs text-muted">Repère rapide pour choisir un câble d&apos;alimentation. Pour une chute de tension précise selon la longueur, utilise la calculette <Link href="/calculettes" className="text-accent underline">Câble</Link>.</p>
      </Card>

      <Card title="Indice de protection (IP) et classes de matériel" icon={ShieldCheck}>
        <p className="text-sm text-muted">IP suivi de deux chiffres : le premier pour les solides (0 à 6), le second pour les liquides (0 à 8). Plus le chiffre est élevé, plus la protection est forte.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-bg p-3 text-sm"><div className="font-semibold">IP 44 minimum</div><div className="text-muted">En intérieur, pour un spectacle</div></div>
          <div className="rounded-xl border border-line bg-bg p-3 text-sm"><div className="font-semibold">IP 65 minimum</div><div className="text-muted">En extérieur</div></div>
          <div className="rounded-xl border border-line bg-bg p-3 text-sm"><div className="font-semibold">IP 2X</div><div className="text-muted">Électricien : une pièce active peut rester sous tension</div></div>
        </div>
        <Table
          head={["Classe", "Protection"]}
          rows={[["0", "Aucune protection"], ["1", "Toutes les parties métalliques mises à la terre"], ["2", "Double isolation"], ["3", "Très basse tension (TBT)"]]}
        />
      </Card>

      <Card title="Symboles sur le matériel" icon={ShieldCheck}>
        <ElectricalSymbols />
      </Card>

      <Card title="Habilitations électriques (NF C 18-510)" icon={ShieldCheck}>
        <p className="text-sm text-muted">Le symbole se lit en 3 caractères : <strong className="text-fg">1er</strong> le domaine de tension, <strong className="text-fg">2e</strong> le type d&apos;opération, <strong className="text-fg">3e</strong> (facultatif) une précision. Certains symboles prennent aussi un attribut : Essai, Vérification, Mesurage, Manœuvre.</p>
        <Table
          head={["Caractère", "Signification"]}
          rows={[
            ["1er : B", "Basse et très basse tension"],
            ["1er : H", "Haute tension"],
            ["2e : 0", "Opération d'ordre non électrique"],
            ["2e : 1", "Exécutant d'opération d'ordre électrique"],
            ["2e : 2", "Chargé de travaux d'ordre électrique"],
            ["2e : C", "Consignation"],
            ["2e : R", "Intervention BT générale"],
            ["2e : S", "Intervention BT élémentaire"],
            ["2e : E", "Opérations spécifiques (essai, vérification, mesurage, manœuvre)"],
            ["2e : P", "Opérations BT élémentaires sur chaîne photovoltaïque"],
            ["3e : T", "Travaux sous tension"],
            ["3e : V", "Travaux au voisinage renforcé"],
            ["3e : N", "Nettoyage sous tension"],
            ["3e : X", "Opération spéciale"],
          ]}
        />
        <Table
          head={["Symbole", "Pour qui, pour quoi"]}
          rows={[
            ["B0 / H0", "Exécutant non électricien : accès à une zone électrique, sans aucune opération électrique"],
            ["B0 / H0, « chargé de chantier »", "Dirige des travaux non électriques près d'une installation électrique"],
            ["BS", "Intervention élémentaire sur un circuit terminal (400 V / 32 A maxi) : remplacer un fusible, une lampe, une prise, un interrupteur à l'identique, raccorder un appareil sur un circuit en attente protégé, réarmer une protection. Rien d'autre."],
            ["BE / HE Manœuvre", "Réarmer un disjoncteur ou un relais, mettre hors ou sous tension un équipement — rien de plus"],
            ["BR", "Intervention générale : dépannage, recherche de panne, remplacement de matériel, essais, jusqu'à 500 V / 63 A en présence de tension"],
            ["B1 / H1 (exécutant), B1V / H1V (+ voisinage renforcé)", "Exécute des travaux électriques sous les ordres d'un chargé de travaux"],
            ["B2 / H2 (chargé), B2V / H2V (+ voisinage renforcé)", "Dirige des travaux électriques, balise la zone, vérifie le travail"],
            ["BC / HC", "Consigne un ouvrage ou une installation électrique"],
            ["B1T, B2T… (travaux sous tension)", "Opérations réalisées sous tension (formation spécifique agréée obligatoire)"],
            ["BF-HF", "Travaux en fouilles à proximité de canalisations électriques enterrées"],
          ]}
        />
        <p className="text-xs text-muted">« Circuit terminal » : une prise, un chauffage, une lampe — câblé en 6 mm² maximum, 400 V maximum. « Voisinage renforcé » : à moins de 30 cm d&apos;une pièce nue sous tension en basse tension.</p>
      </Card>

      <Card title="Qui habilite, et pour combien de temps ?" icon={ShieldCheck}>
        <p className="text-sm">C&apos;est <strong className="text-fg">l&apos;employeur</strong> qui délivre l&apos;habilitation, après une formation préalable théorique et pratique suivie d&apos;un avis du formateur. Elle n&apos;est liée ni au diplôme ni au poste : c&apos;est une reconnaissance, par l&apos;employeur, de la capacité réelle d&apos;une personne à travailler en sécurité face au risque électrique.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-3 text-sm"><div className="font-semibold">Suivi chaque année</div><div className="text-muted">L&apos;employeur vérifie que l&apos;habilitation reste adaptée aux tâches réellement confiées.</div></div>
          <div className="rounded-xl border border-line bg-bg p-3 text-sm"><div className="font-semibold">Recyclage recommandé tous les 3 ans</div><div className="text-muted">1 an pour les travaux sous tension. La périodicité reste fixée par l&apos;employeur, réduite si la pratique est occasionnelle.</div></div>
        </div>
        <p className="text-xs text-muted">Source : brochure INRS ED 6127, « L&apos;habilitation électrique » (décembre 2020), d&apos;après la norme NF C 18-510.</p>
      </Card>

      <Card title="EPI (équipement de protection individuelle)" icon={ShieldCheck}>
        <p className="text-sm text-muted">Le matériel est fourni par l&apos;employeur ; chacun est responsable du sien.</p>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          <li>• <strong className="text-fg">Chaussures</strong> : attachées, rien sous la semelle</li>
          <li>• <strong className="text-fg">Gants</strong> isolants</li>
          <li>• <strong className="text-fg">Casque</strong> avec visière, marqué du double triangle</li>
          <li>• <strong className="text-fg">Tapis</strong> isolant</li>
          <li>• <strong className="text-fg">Vêtement</strong> : manches longues, synthétique, pas de métal</li>
          <li>• <strong className="text-fg">VAT</strong> (vérificateur d&apos;absence de tension)</li>
          <li>• Pas de montre ni batterie sur soi</li>
        </ul>
      </Card>

      <Card title="Consignation : la procédure en 5 étapes" icon={ShieldCheck}>
        <ol className="space-y-2 text-sm">
          <li><strong className="text-fg">1. EPI</strong> — vérifier gants, tapis, tournevis isolé.</li>
          <li><strong className="text-fg">2. Couper le courant</strong> — délester l&apos;armoire, couper le circuit.</li>
          <li><strong className="text-fg">3. Poser un bloqueur</strong> — bloqueur sur le disjoncteur, cadenas, fiche technique (nom, prénom, date, numéro de téléphone).</li>
          <li><strong className="text-fg">4. VAT</strong> — tester la continuité du vérificateur (contact des deux broches) avant et après le contrôle.</li>
          <li><strong className="text-fg">5. Prévenir le responsable</strong> — avant de commencer l&apos;intervention.</li>
        </ol>
      </Card>

      <Card title="Exemple du cours : choisir une alimentation" icon={Calculator}>
        <p className="text-sm text-muted">1 friteuse (2 kW), 4 découpes (1 kW), 6 PAR (1 kW), 8 PAR LED Zoom (300 W), 1 MAF (1,2 kW), 4 amplis (2 kW), 2 tireuses (1,5 kW), 1 régie (1 kW).</p>
        <p className="text-sm">Puissance totale : <strong className="text-fg">27,6 kW</strong>. Intensité : 27 600 ÷ 230 = <strong className="text-fg">120 A</strong>.</p>
        <p className="text-sm">Une ligne 32 A tétraphasé ne délivre que 32 × 3 = 96 A : insuffisant. On choisit une <strong className="text-fg">63 A tétraphasé</strong>, qui délivre 63 × 3 = <strong className="text-fg">189 A</strong> : largement suffisant.</p>
        <p className="text-xs text-muted">Refais ce calcul avec ton propre matériel dans la calculette <Link href="/calculettes" className="text-accent underline">Bilan de puissance</Link>, et retrouve la répartition détaillée sur les phases et les prises dans l&apos;onglet <strong className="text-fg">Charge</strong> d&apos;un projet.</p>
      </Card>

      <p className="text-xs text-muted">Fiche de synthèse pédagogique, pas un document réglementaire : en situation réelle, suis les consignes de ton tuteur et de ton habilitation.</p>
      </div>

      {/* Reste collé pendant le défilement sur PC : le QCM suit la lecture, pas besoin de redescendre le chercher. */}
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:slim-scroll">
        <QuizLoader />
      </aside>
      </div>
    </div>
  );
}
