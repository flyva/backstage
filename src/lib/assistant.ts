import "server-only";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bdeEvents, contacts, equipmentItems, faqItems, loans, newsPosts, usefulLinks, wikiPages, workDays } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { getEvents } from "@/lib/ical";
import { homeGlance } from "@/lib/glance";
import { cardHref, dueCards } from "@/lib/reminders";
import { todayParis } from "@/lib/equipment";
import { KIND_LABEL, addDays } from "@/lib/alternance";
import type { SessionUser } from "@/lib/auth";

// Assistant SANS intelligence artificielle : il cherche dans les contenus de Backstage (FAQ, wiki, contacts, liens, actus,
// évènements, matériel, réglages) avec un classement par mots-clés (BM25), et répond aux questions personnelles
// (prochain cours, tâches, prêts, planning, prochain passage) en interrogeant directement tes données.

export type AssistantSource = { title: string; href: string; external?: boolean };
export type AssistantReply = { text: string; sources: AssistantSource[]; suggestions?: string[] };

// ---------- Texte : normalisation, mots vides, racines, synonymes ----------

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, " ").replace(/wi[- ]?fi/g, "wifi");

const STOP = new Set(
  "a au aux avec ce ces cet cette dans de des du elle en et eux il ils je la le les leur lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y est sont suis es sommes etes etre ai as avons avez ont avoir fait faire peut peux puis comment quel quelle quels quelles quand ou combien pourquoi ca cela ceci si plus moins tres bien tout tous toute toutes fais dois doit dois faut veux veut voudrais aimerais savoir besoin ya il y a quoi donc alors aussi deja encore".split(/\s+/),
);

const SYNONYMS: Record<string, string[]> = {
  prof: ["enseignant", "professeur", "referent", "intervenant"],
  profs: ["enseignant", "professeur", "referent"],
  mail: ["email", "webmail", "messagerie", "adresse"],
  email: ["mail", "webmail"],
  wifi: ["wi", "fi", "reseau", "internet", "connexion", "qr"],
  internet: ["wifi", "connexion", "reseau"],
  manger: ["restaurer", "restaurant", "cafeteria", "repas", "dejeuner", "midi"],
  bouffe: ["manger", "restaurer", "repas"],
  dejeuner: ["manger", "repas", "restaurer"],
  cantine: ["restaurer", "cafeteria", "refectory"],
  tram: ["tramway", "transport", "ligne"],
  bus: ["transport", "ligne"],
  transport: ["tram", "tramway", "tbm", "bus", "abonnement"],
  abonnement: ["tbm", "pass", "jeune"],
  loger: ["logement", "residence", "studio"],
  logement: ["residence", "studio", "loyer"],
  appartement: ["logement", "residence"],
  absence: ["absent", "retard", "justificatif", "assiduite", "vie", "scolaire"],
  absent: ["absence", "retard", "justificatif"],
  retard: ["absence", "assiduite"],
  malade: ["sante", "blesse", "infirmerie", "absence"],
  blesse: ["infirmerie", "sante", "secours"],
  psy: ["psychologue", "soutien", "ecoute", "nightline"],
  stress: ["soutien", "ecoute", "psychologue"],
  deprime: ["soutien", "ecoute", "psychologue"],
  harcelement: ["vhss", "signaler", "signalement", "violence"],
  harcele: ["vhss", "signaler", "harcelement"],
  stage: ["relations", "entreprise", "convention"],
  alternance: ["relations", "entreprise", "planning"],
  convention: ["stage", "econventionbordeaux", "signer"],
  pret: ["emprunter", "emprunt", "materiel", "magasin"],
  emprunter: ["materiel", "magasin", "caution", "pret"],
  materiel: ["magasin", "emprunter", "pret", "caution"],
  caution: ["cheque", "materiel", "500"],
  salle: ["reserver", "reservation", "cabine", "plateau"],
  reserver: ["salle", "reservation"],
  ordi: ["ordinateur", "portable", "informatique"],
  informatique: ["support", "panne", "ordinateur", "connexion"],
  panne: ["support", "informatique"],
  mdp: ["mot", "passe", "identifiant", "connexion"],
  motdepasse: ["mot", "passe", "identifiant"],
  identifiant: ["mot", "passe", "wifi", "prenom", "nom"],
  assurance: ["responsabilite", "civile", "rc"],
  cvec: ["contribution", "vie", "etudiante", "crous"],
  cheque: ["caution"],
  carte: ["etudiante"],
  bde: ["bureau", "eleves", "association", "evenement"],
  asso: ["bde", "association"],
  association: ["bde", "bureau", "eleves"],
  club: ["clubs", "communication"],
  etranger: ["erasmus", "mobilite", "international"],
  erasmus: ["mobilite", "international", "etranger"],
  handicap: ["referente", "ascenseur", "amenagement"],
  ascenseur: ["handicap", "mobilite", "reduite"],
  incendie: ["evacuation", "alarme", "securite", "rassemblement"],
  alarme: ["incendie", "evacuation"],
  epi: ["chaussures", "securite", "casque", "gants", "equipement"],
  fournitures: ["equipement", "materiel", "epi", "ordinateur"],
  horaires: ["ouverture", "ouvert", "heures"],
  ouvert: ["ouverture", "horaires"],
  adresse: ["campus", "rue", "begles", "acceder"],
  venir: ["acces", "campus", "tram", "voiture", "parking"],
  parking: ["voiture", "zone", "bleue", "disque"],
  velo: ["trottinette", "cadenas", "rack"],
  contact: ["contacter", "mail", "annuaire"],
  contacter: ["contact", "mail", "annuaire"],
  directrice: ["direction", "directeur"],
  directeur: ["direction"],
};

/** Racine très simple : retire les pluriels et quelques terminaisons courantes. */
const stem = (w: string) => (w.length > 4 ? w.replace(/(aux|eaux)$/, "al").replace(/(s|x)$/, "").replace(/(er|ez|ent)$/, "") : w);

function tokens(text: string, expand = false): string[] {
  const base = norm(text).split(/[^a-z0-9@]+/).filter((t) => t && !STOP.has(t) && (t.length > 1 || /\d/.test(t)));
  const out: string[] = [];
  for (const t of base) {
    out.push(stem(t));
    if (expand) for (const s of SYNONYMS[t] ?? SYNONYMS[stem(t)] ?? []) out.push(stem(s));
  }
  return out;
}

// ---------- Corpus ----------

type Doc = { id: string; kind: string; title: string; text: string; href: string; external?: boolean; weight: number };

let cache: { at: number; docs: Doc[] } | null = null;

const plain = (md: string) => md.replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b ?? a).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*]{2}|__|[*`>#]/g, "").replace(/[ \t]+/g, " ").trim();

async function buildCorpus(): Promise<Doc[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.docs;
  const [faq, wiki, people, links, news, events, gear, s] = await Promise.all([
    db.select().from(faqItems).orderBy(asc(faqItems.id)),
    db.select().from(wikiPages),
    db.select().from(contacts),
    db.select().from(usefulLinks),
    db.select({ id: newsPosts.id, title: newsPosts.title, body: newsPosts.body }).from(newsPosts).orderBy(desc(newsPosts.createdAt)).limit(30),
    db.select().from(bdeEvents).where(gte(bdeEvents.startsAt, new Date())).orderBy(asc(bdeEvents.startsAt)).limit(20),
    db.select({ id: equipmentItems.id, name: equipmentItems.name, category: equipmentItems.category, description: equipmentItems.description }).from(equipmentItems).limit(300),
    getSettings(),
  ]);
  const docs: Doc[] = [];
  for (const f of faq) docs.push({ id: `faq${f.id}`, kind: "FAQ", title: f.question, text: f.answer, href: "/faq", weight: 1.4 });
  for (const p of wiki) {
    // Une entrée par section « ## » : la réponse est un passage précis, pas toute la page.
    const parts = p.body.split(/^##\s+/m);
    const intro = parts.shift() ?? "";
    if (plain(intro)) docs.push({ id: `w${p.id}`, kind: "Wiki", title: p.title, text: intro, href: `/wiki/${p.slug}`, weight: 1 });
    for (const part of parts) {
      const nl = part.indexOf("\n");
      const heading = (nl < 0 ? part : part.slice(0, nl)).trim();
      const body = nl < 0 ? "" : part.slice(nl + 1);
      docs.push({ id: `w${p.id}:${heading}`, kind: "Wiki", title: `${p.title} : ${heading}`, text: body, href: `/wiki/${p.slug}`, weight: 1.1 });
    }
  }
  for (const c of people) docs.push({ id: `c${c.id}`, kind: "Contact", title: c.name, text: `${c.role ?? ""}. ${c.groupName}. ${c.email ?? ""} ${c.phone ?? ""} ${c.note ?? ""}`, href: `/contacts?q=${encodeURIComponent(c.name)}`, weight: 1.2 });
  for (const l of links) docs.push({ id: `l${l.id}`, kind: "Lien", title: l.label, text: `${l.description ?? ""} ${l.category}`, href: l.url, external: true, weight: 0.9 });
  for (const n of news) docs.push({ id: `n${n.id}`, kind: "Actu", title: n.title, text: n.body.slice(0, 600), href: `/actus/${n.id}`, weight: 0.8 });
  for (const e of events) docs.push({ id: `e${e.id}`, kind: "Évènement BDE", title: e.title, text: `${e.description ?? ""} ${e.location ?? ""}`, href: "/bde", weight: 1 });
  for (const g of gear) docs.push({ id: `g${g.id}`, kind: "Matériel", title: g.name, text: `${g.category} ${g.description ?? ""}`, href: `/materiel/${g.id}`, weight: 0.8 });
  if (s.school_address) docs.push({ id: "s-adresse", kind: "École", title: "Adresse de l'école", text: `L'école est au ${s.school_address}. Adresse, campus, plan, où est l'école.`, href: "/ecole", weight: 1.3 });
  if (s.webmail_url) docs.push({ id: "s-webmail", kind: "Lien", title: "Webmail 3iS", text: "Messagerie mail email webmail 3iS", href: s.webmail_url, external: true, weight: 1.2 });
  if (s.ypareo_url) docs.push({ id: "s-ypareo", kind: "Lien", title: "Ypareo", text: "Emploi du temps notes absences Ypareo Netypareo", href: s.ypareo_url, external: true, weight: 1.2 });
  cache = { at: Date.now(), docs };
  return docs;
}

// ---------- Classement BM25 ----------

function rank(docs: Doc[], query: string) {
  const q = [...new Set(tokens(query, true))];
  if (q.length === 0) return [];
  const own = new Set(tokens(query)); // mots réellement écrits (les synonymes comptent moins)
  const prepared = docs.map((d) => ({ d, tt: tokens(d.title), tb: tokens(d.text) }));
  const N = prepared.length || 1;
  const avg = prepared.reduce((s, x) => s + x.tt.length * 3 + x.tb.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const w of q) df.set(w, prepared.filter((x) => x.tt.includes(w) || x.tb.includes(w)).length);
  const k1 = 1.4, b = 0.75;
  return prepared
    .map(({ d, tt, tb }) => {
      const len = tt.length * 3 + tb.length;
      let score = 0;
      let hits = 0;
      for (const w of q) {
        const f = tt.filter((t) => t === w).length * 3 + tb.filter((t) => t === w).length;
        if (!f) continue;
        hits++;
        const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
        const tf = (f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / avg));
        score += idf * tf * (own.has(w) ? 1 : 0.55);
      }
      const coverage = hits / q.length;
      return { d, score: score * d.weight * (0.6 + 0.4 * coverage), hits };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Passage le plus proche de la question dans un texte long. */
function excerpt(text: string, query: string, max = 520) {
  const clean = plain(text);
  if (clean.length <= max) return clean;
  const q = new Set(tokens(query, true));
  const sentences = clean.split(/(?<=[.!?])\s+|\n+/).filter((x) => x.trim());
  let best = 0, bestScore = -1;
  sentences.forEach((s, i) => { const sc = tokens(s).filter((t) => q.has(t)).length; if (sc > bestScore) { bestScore = sc; best = i; } });
  let out = sentences[best] ?? clean.slice(0, max);
  for (let i = best + 1; i < sentences.length && out.length < max * 0.7; i++) out += " " + sentences[i];
  return out.length > max ? out.slice(0, max).replace(/\s+\S*$/, "") + "…" : out;
}

// ---------- Questions personnelles ----------

const fmtTime = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

async function personal(q: string, user: SessionUser): Promise<AssistantReply | null> {
  const n = norm(q);

  if (/\b(prochain(s)? cours|emploi du temps|planning (de )?(la semaine|cours)|cours (de )?(demain|aujourd|ce jour)|j.?ai quoi|qu.?est.?ce que j.?ai)\b/.test(n)) {
    if (!user.icalUrl) return { text: "Je ne vois pas encore ton emploi du temps. Ajoute ton **lien iCalendar Ypareo** dans ton profil, et je pourrai te dire tes prochains cours.", sources: [{ title: "Mon profil", href: "/profil" }] };
    try {
      const now = new Date();
      const list = (await getEvents(user.icalUrl, new Date(now.getTime() - 864e5), new Date(now.getTime() + 7 * 864e5))).filter((e) => !e.allDay && e.end >= now).sort((a, b) => a.start.getTime() - b.start.getTime());
      if (list.length === 0) return { text: "Je ne trouve aucun cours dans les 7 prochains jours.", sources: [{ title: "Mon agenda", href: "/agenda" }] };
      const lines = list.slice(0, 4).map((e) => `- **${fmtDay.format(e.start)}**, ${fmtTime.format(e.start)}–${fmtTime.format(e.end)} : ${e.title}${e.location ? ` (${e.location})` : ""}`);
      return { text: `Tes prochains cours :\n${lines.join("\n")}`, sources: [{ title: "Mon agenda", href: "/agenda" }] };
    } catch {
      return { text: "Je n'arrive pas à lire ton planning Ypareo pour le moment. Vérifie ton lien dans ton profil.", sources: [{ title: "Mon profil", href: "/profil" }] };
    }
  }

  if (/\b(prochain(s)? (tram|bus|passage)|quand (passe|arrive)|horaires? (du )?(tram|bus)|tram (c|f)|il y a un (tram|bus))\b/.test(n)) {
    if (user.homeLat == null || user.homeLng == null) return { text: "Pour te donner les prochains passages, j'ai besoin de ton **adresse** : renseigne-la dans ton profil.", sources: [{ title: "Mon profil", href: "/profil" }] };
    const glance = await homeGlance({ lat: user.homeLat, lng: user.homeLng }).catch(() => null);
    const stop = glance?.stops.find((s) => s.departures.length > 0);
    if (!stop) return { text: "Aucun passage prévu prochainement près de chez toi (il n'y a peut-être plus de service à cette heure).", sources: [{ title: "Mobilité", href: "/mobilite" }] };
    const lines = stop.departures.slice(0, 3).map((d) => `- **${d.line}** vers ${d.destination} : ${d.minutes.slice(0, 3).map((m) => (m <= 0 ? "imminent" : `${m} min`)).join(", ")}`);
    return { text: `À l'arrêt **${stop.name}** :\n${lines.join("\n")}`, sources: [{ title: "Mobilité", href: "/mobilite" }] };
  }

  if (/\b(mes? (taches?|to.?do|echeances?)|kanban|a faire|quoi faire|a finir)\b/.test(n)) {
    const tomorrow = addDays(todayParis(), 1);
    const due = await dueCards(tomorrow, user.id);
    if (due.length === 0) return { text: "Rien d'urgent : aucune tâche à échéance aujourd'hui ou demain, ni en retard. 🎉", sources: [{ title: "Mon kanban", href: "/kanban" }] };
    const today = todayParis();
    const lines = due.slice(0, 6).map((c) => `- **${c.title}** (${c.personal ? "mon kanban" : c.projectName}) : ${c.dueDate < today ? "en retard" : c.dueDate === today ? "aujourd'hui" : "demain"}`);
    return { text: `Tes tâches à finir :\n${lines.join("\n")}`, sources: [{ title: "Mon kanban", href: due[0] ? cardHref(due[0]) : "/kanban" }] };
  }

  if (/\b(mes? (prets?|emprunts?)|ai.?je (du|emprunte)|materiel (a|que je dois) rendre|a rendre)\b/.test(n)) {
    const rows = await db
      .select({ name: equipmentItems.name, due: loans.dueDate, status: loans.status, qty: loans.quantity })
      .from(loans)
      .innerJoin(equipmentItems, eq(equipmentItems.id, loans.itemId))
      .where(and(eq(loans.userId, user.id), inArray(loans.status, ["requested", "reserved", "out"])))
      .orderBy(asc(loans.dueDate));
    if (rows.length === 0) return { text: "Tu n'as aucun prêt de matériel en cours.", sources: [{ title: "Matériel", href: "/materiel" }] };
    const label = { requested: "demandé", reserved: "réservé", out: "emprunté" } as const;
    return { text: `Tes prêts :\n${rows.map((r) => `- ${r.qty > 1 ? `${r.qty} × ` : ""}**${r.name}** : ${label[r.status as keyof typeof label]}, à rendre le ${r.due}`).join("\n")}`, sources: [{ title: "Matériel", href: "/materiel" }] };
  }

  if (/\b(suis.?je|je suis|on est|jour).{0,25}(ecole|entreprise|3is)|\b(ecole|entreprise) (aujourd|demain|cette semaine)|planning (d.?)?alternance|c.?est (ecole|entreprise)\b/.test(n)) {
    const today = todayParis();
    const rows = await db.select({ day: workDays.day, kind: workDays.kind }).from(workDays).where(and(eq(workDays.userId, user.id), inArray(workDays.day, [today, addDays(today, 1)])));
    const of = (d: string) => rows.find((r) => r.day === d)?.kind;
    if (!of(today) && !of(addDays(today, 1))) return { text: "Je n'ai rien de planifié pour aujourd'hui ni demain. Importe le **calendrier de l'école** (PDF) dans la page Alternance et je saurai te répondre.", sources: [{ title: "Alternance", href: "/alternance" }] };
    const say = (d: string, label: string) => { const k = of(d); return k ? `- ${label} : **${KIND_LABEL[k]}**` : `- ${label} : non planifié`; };
    return { text: `${say(today, "Aujourd'hui")}\n${say(addDays(today, 1), "Demain")}`, sources: [{ title: "Planning de l'alternance", href: "/alternance" }] };
  }

  if (/\b(wifi|wi-fi|reseau (de l.?ecole|3is))\b/.test(n)) {
    const s = await getSettings();
    if (!s.wifi_ssid) return null;
    const [local, domain] = user.email.toLowerCase().split("@");
    const login = domain === "3is.fr" ? local : `${norm(user.firstName).replace(/[^a-z0-9]+/g, "-")}.${norm(user.lastName).replace(/[^a-z0-9]+/g, "-")}`;
    return { text: `Réseau **${s.wifi_ssid}**. Ton identifiant : **${login}**. Mot de passe : celui de ton compte Office 3iS (le même que le webmail). Des affiches avec un QR code à flasher sont installées dans l'école.`, sources: [{ title: "Wi-Fi et plan", href: "/ecole" }] };
  }

  if (/^\s*(salut|bonjour|hello|coucou|hey|bonsoir|yo)\b/.test(n) && n.trim().split(/\s+/).length <= 3) {
    return { text: "Salut ! Je peux te répondre sur la vie à l'école (accès, Wi-Fi, absences, matériel, contacts…) et sur tes propres infos (prochain cours, tâches, prêts, planning). Pose ta question !", sources: [] };
  }
  if (/\b(merci|top|parfait|super|genial)\b/.test(n) && n.trim().split(/\s+/).length <= 4) return { text: "Avec plaisir ! 👍", sources: [] };
  if (/\b(aide|que sais.?tu|tu peux quoi|comment (ca )?marche)\b/.test(n) && n.trim().split(/\s+/).length <= 6) {
    return { text: "Je cherche dans **Backstage** : la FAQ, le wiki (guide de rentrée), l'annuaire des contacts, les liens utiles, les actus, les évènements BDE et le matériel. Je réponds aussi sur **tes** infos : prochain cours, prochain tram, tâches à finir, prêts en cours, jour école ou entreprise. Je ne suis pas une intelligence artificielle : je retrouve ce qui est écrit, donc plus ta question est précise, mieux je réponds.", sources: [] };
  }
  return null;
}

export const SUGGESTIONS = [
  "Quel est le mot de passe du wifi ?",
  "Quel est mon prochain cours ?",
  "Qui contacter pour un stage ?",
  "Comment emprunter du matériel ?",
  "Où manger près de l'école ?",
  "Que faire en cas d'absence ?",
  "Quand passe le prochain tram ?",
  "Quelles sont mes tâches à finir ?",
];

/** Répond à une question : d'abord les questions personnelles, sinon une recherche dans les contenus de Backstage. */
export async function answer(question: string, user: SessionUser): Promise<AssistantReply> {
  const q = question.trim().slice(0, 300);
  const mine = await personal(q, user);
  if (mine) return mine;

  const docs = await buildCorpus();
  const ranked = rank(docs, q);
  const top = ranked[0];
  // Seuil : au moins un mot de la question doit vraiment apparaître, avec un score correct.
  if (!top || top.score < 1.2) {
    return {
      text: "Je n'ai rien trouvé de précis sur ça dans Backstage. Essaie avec d'autres mots (par exemple « absence », « wifi », « matériel », « stage »), ou pose ta question à la **vie scolaire** : viescolaire.bordeaux@3is.fr, 05 56 51 90 30.",
      sources: [{ title: "Contacts de l'école", href: "/contacts" }, { title: "FAQ", href: "/faq" }],
      suggestions: SUGGESTIONS.slice(0, 4),
    };
  }

  const main = top.d;
  let text = excerpt(main.text, q);
  if (main.kind === "Contact") text = `**${main.title}**\n\n${plain(main.text)}`;
  else if (main.kind === "FAQ") text = `**${main.title}**\n\n${excerpt(main.text, q, 700)}`;
  else text = `**${main.title}**\n\n${text}`;

  const seen = new Set<string>();
  const sources: AssistantSource[] = [];
  for (const r of ranked.slice(0, 6)) {
    if (r.score < top.score * 0.35 && sources.length > 0) break;
    const k = r.d.href;
    if (seen.has(k)) continue;
    seen.add(k);
    sources.push({ title: `${r.d.kind} · ${r.d.title}`, href: r.d.href, external: r.d.external });
    if (sources.length >= 3) break;
  }
  return { text, sources };
}
