import Link from "next/link";
import { AlertTriangle, Calculator, ShieldCheck, Zap } from "lucide-react";

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
    <div className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Habilitation électrique</h1>
        <p className="text-sm text-muted">Fiche de référence du cours : formules, dangers, disjoncteurs, IP, classes, habilitations (NFC 18-510) et la procédure de consignation.</p>
      </header>

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

      <Card title="Habilitations électriques (NFC 18-510)" icon={ShieldCheck}>
        <Table
          head={["Code", "Qui ?", "Quoi ?"]}
          rows={[
            ["B0", "Exécutant non électricien", "Peut travailler à proximité, sans intervenir sur l'installation"],
            ["B1", "Exécutant électricien", "Exécute des opérations sous les ordres d'un chargé de travaux"],
            ["B2", "Chef (chargé de travaux)", "Dirige des travaux électriques"],
            ["BS", "Chargé d'intervention élémentaire", "Remplace fusibles, réarme un disjoncteur, sur un circuit terminal"],
            ["V", "Indice « voisinage renforcé »", "À moins de 30 cm d'une pièce nue sous tension"],
            ["H0 / H1 / H2", "Équivalent B0/B1/B2 en haute tension", "Mêmes rôles, domaine haute tension"],
          ]}
        />
        <p className="text-xs text-muted">« Circuit terminal » : une prise, un chauffage, une lampe — hors tension, câblé en 6 mm² maximum, 400 V maximum.</p>
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
        <p className="text-xs text-muted">Retrouve cet exemple pré-rempli dans la calculette <Link href="/calculettes" className="text-accent underline">Bilan de puissance</Link>, et la répartition détaillée sur les phases et les prises dans l&apos;onglet <strong className="text-fg">Charge</strong> d&apos;un projet.</p>
      </Card>

      <p className="text-xs text-muted">Fiche de synthèse pédagogique, pas un document réglementaire : en situation réelle, suis les consignes de ton tuteur et de ton habilitation.</p>
    </div>
  );
}
