import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  buildSlotAssignees, buildSlots, checklistItems, checklists, cues, powerCircuits, powerItems, kanbanCardAssignees, kanbanCards, kanbanColumns, projectMembers, techInputs, techLights, users, type ProjectRole,
} from "@/db/schema";
import { toCsv } from "@/lib/csv";
import { ROLE_LABEL } from "@/lib/projects";
import { findConflicts, patchLabel } from "@/lib/tech";
import { fmtAmps, fmtWatts, lineResult } from "@/lib/power";
import { CATEGORY_LABEL, formatDuration } from "@/lib/time";

type Project = { id: number; name: string; description: string | null; eventDate: string | null };

const PRIORITY: Record<string, string> = { low: "Basse", normal: "Normale", high: "Haute", urgent: "Urgente" };

/** Toutes les données d'un projet nécessaires aux exports. Les e-mails de l'équipe ne sont donnés qu'au propriétaire. */
export async function loadDossier(project: Project, role: ProjectRole) {
  const [cueRows, memberRows, lists, lights, inputs, columns, slotRows, circuitRows, powerRows] = await Promise.all([
    db.select().from(cues).where(eq(cues.projectId, project.id)).orderBy(asc(cues.position), asc(cues.id)),
    db
      .select({ name: users.name, email: users.email, role: projectMembers.role })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, project.id))
      .orderBy(asc(users.name)),
    db.select().from(checklists).where(eq(checklists.projectId, project.id)).orderBy(asc(checklists.position), asc(checklists.id)),
    db.select().from(techLights).where(eq(techLights.projectId, project.id)).orderBy(asc(techLights.channel), asc(techLights.universe), asc(techLights.address)),
    db.select().from(techInputs).where(eq(techInputs.projectId, project.id)).orderBy(asc(techInputs.channel)),
    db.select().from(kanbanColumns).where(eq(kanbanColumns.projectId, project.id)).orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id)),
    db.select().from(buildSlots).where(eq(buildSlots.projectId, project.id)).orderBy(asc(buildSlots.day), asc(buildSlots.startTime), asc(buildSlots.id)),
    db.select().from(powerCircuits).where(eq(powerCircuits.projectId, project.id)).orderBy(asc(powerCircuits.position), asc(powerCircuits.id)),
    db.select().from(powerItems).where(eq(powerItems.projectId, project.id)).orderBy(asc(powerItems.name)),
  ]);
  const slotLinks = slotRows.length
    ? await db.select({ slotId: buildSlotAssignees.slotId, name: users.name }).from(buildSlotAssignees).innerJoin(users, eq(users.id, buildSlotAssignees.userId)).where(inArray(buildSlotAssignees.slotId, slotRows.map((x) => x.id))).orderBy(asc(users.name))
    : [];
  const slotNames = Map.groupBy(slotLinks, (l) => l.slotId);
  const loads = circuitRows.map((c) => lineResult(c, powerRows));
  const items = lists.length
    ? await db.select().from(checklistItems).where(inArray(checklistItems.checklistId, lists.map((l) => l.id))).orderBy(asc(checklistItems.position), asc(checklistItems.id))
    : [];
  const itemsBy = Map.groupBy(items, (i) => i.checklistId);
  const cards = columns.length
    ? await db
        .select({ card: kanbanCards })
        .from(kanbanCards)
        .where(inArray(kanbanCards.columnId, columns.map((c) => c.id)))
        .orderBy(asc(kanbanCards.position), asc(kanbanCards.id))
    : [];
  const assigneeRows = cards.length
    ? await db
        .select({ cardId: kanbanCardAssignees.cardId, name: users.name })
        .from(kanbanCardAssignees)
        .innerJoin(users, eq(users.id, kanbanCardAssignees.userId))
        .where(inArray(kanbanCardAssignees.cardId, cards.map((c) => c.card.id)))
        .orderBy(asc(users.name))
    : [];
  const assigneesBy = Map.groupBy(assigneeRows, (r) => r.cardId);
  const colTitle = new Map(columns.map((c) => [c.id, c.title]));
  const starts = cueRows.reduce<number[]>((out, c, i) => [...out, i === 0 ? 0 : out[i - 1] + (cueRows[i - 1].durationSec ?? 0)], []);

  return {
    cues: cueRows.map((c, i) => ({ number: c.number ?? String(i + 1), category: CATEGORY_LABEL[c.category], title: c.title, duration: c.durationSec, start: starts[i], notes: c.notes })),
    members: memberRows.map((m) => ({ name: m.name, role: ROLE_LABEL[m.role], email: role === "owner" ? m.email : null })),
    checklists: lists.map((l) => ({ title: l.title, items: (itemsBy.get(l.id) ?? []).map((i) => ({ label: i.label, done: i.done })) })),
    lights,
    inputs,
    conflicts: findConflicts(lights),
    slots: slotRows.map((x) => ({ day: x.day, start: x.startTime, end: x.endTime, title: x.title, who: (slotNames.get(x.id) ?? []).map((n) => n.name).join(", "), notes: x.notes })),
    power: {
      circuits: loads.map((l) => ({ name: l.circuit.name, breaker: l.circuit.breakerAmps, kind: l.mode === "tetra" ? "Tétra" : "Mono", watts: l.watts, amps: Math.max(...l.phases.map((p) => p.amps)), pct: Math.round(l.worstPct), level: l.level })),
      items: powerRows.map((i) => ({ name: i.name, qty: i.qty, watts: i.watts, circuit: circuitRows.find((c) => c.id === i.circuitId)?.name ?? "" })),
      total: powerRows.reduce((sum, i) => sum + i.watts * i.qty, 0),
    },
    tasks: cards.map(({ card }) => ({
      title: card.title, status: colTitle.get(card.columnId) ?? "", priority: PRIORITY[card.priority], assignee: (assigneesBy.get(card.id) ?? []).map((a) => a.name).join(", "), due: card.dueDate, labels: card.labels,
    })),
  };
}
export type Dossier = Awaited<ReturnType<typeof loadDossier>>;

// ---------- CSV (s'ouvrent dans Excel) ----------

export const conduiteCsv = (d: Dossier) =>
  toCsv(["N°", "Type", "Cue", "Départ (T+)", "Durée", "Notes"], d.cues.map((c) => [c.number, c.category, c.title, formatDuration(c.start), formatDuration(c.duration), c.notes]));

export const equipeCsv = (d: Dossier) =>
  toCsv(["Nom", "Rôle", "E-mail"], d.members.map((m) => [m.name, m.role, m.email]));

export const planningCsv = (d: Dossier) =>
  toCsv(["Jour", "Début", "Fin", "Tâche", "Qui", "Notes"], d.slots.map((x) => [x.day, x.start, x.end, x.title, x.who, x.notes]));

export const chargeCsv = (d: Dossier) =>
  toCsv(
    ["Circuit", "Calibre (A)", "Phase", "Puissance (W)", "Intensité (A)", "Charge (%)"],
    d.power.circuits.map((c) => [c.name, c.breaker, c.kind, c.watts, fmtAmps(c.amps), c.pct]),
  );

export const checklistsCsv = (d: Dossier) =>
  toCsv(["Checklist", "Point", "Fait"], d.checklists.flatMap((l) => (l.items.length ? l.items.map((i) => [l.title, i.label, i.done ? "oui" : "non"]) : [[l.title, "", ""]])));

// ---------- Dossier complet (un seul fichier HTML, à ouvrir ou à imprimer en PDF) ----------

const esc = (v: string | number | null | undefined) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const dateLong = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long" });

function table(head: string[], rows: (string | number | null | undefined)[][], empty: string) {
  if (rows.length === 0) return `<p class="muted">${esc(empty)}</p>`;
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function dossierHtml(project: Project, d: Dossier): string {
  const totalSec = d.cues.reduce((s, c) => s + (c.duration ?? 0), 0);
  const conflictCount = d.conflicts.size;
  const checklistHtml = d.checklists.length
    ? d.checklists
        .map((l) => {
          const done = l.items.filter((i) => i.done).length;
          return `<h3>${esc(l.title)} <span class="muted">(${done}/${l.items.length})</span></h3><ul class="check">${l.items
            .map((i) => `<li class="${i.done ? "done" : ""}"><span class="box">${i.done ? "✔" : ""}</span> ${esc(i.label)}</li>`)
            .join("")}</ul>`;
        })
        .join("")
    : `<p class="muted">Aucune checklist.</p>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.name)} – Dossier complet</title>
<style>
  :root { color-scheme: light; }
  body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; max-width: 960px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 19px; margin: 32px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #111; }
  h3 { font-size: 15px; margin: 16px 0 4px; }
  .muted { color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 6px 0; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { border-bottom: 1.5px solid #111; font-weight: 600; }
  tr { break-inside: avoid; }
  ul.check { list-style: none; padding: 0; margin: 4px 0; }
  ul.check li { padding: 2px 0; }
  ul.check li.done { color: #666; text-decoration: line-through; }
  .box { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #111; border-radius: 3px; text-align: center; line-height: 12px; font-size: 11px; margin-right: 6px; vertical-align: -2px; }
  .warn { color: #b00020; font-weight: 600; }
  .toc a { color: inherit; }
  .bar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
  button { font: inherit; padding: 6px 12px; border: 1px solid #111; background: #fff; border-radius: 8px; cursor: pointer; }
  @media print { .bar { display: none; } body { padding: 0; } h2 { break-after: avoid; } }
</style>
</head>
<body>
<div class="bar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
<h1>${esc(project.name)}</h1>
<p class="muted">Dossier complet${project.eventDate ? ` · ${esc(dateLong.format(new Date(project.eventDate)))}` : ""} · édité le ${esc(dateLong.format(new Date()))}</p>
${project.description ? `<p>${esc(project.description).replace(/\n/g, "<br>")}</p>` : ""}
<p class="toc muted">
  <a href="#equipe">Équipe (${d.members.length})</a> · <a href="#conduite">Conduite (${d.cues.length})</a> · <a href="#checklists">Checklists (${d.checklists.length})</a> ·
  <a href="#planning">Planning (${d.slots.length})</a> · <a href="#charge">Charge</a> · <a href="#lumiere">Lumière (${d.lights.length})</a> · <a href="#son">Son (${d.inputs.length})</a> · <a href="#taches">Tâches (${d.tasks.length})</a>
</p>

<h2 id="equipe">Équipe</h2>
${table(["Nom", "Rôle", ...(d.members.some((m) => m.email) ? ["E-mail"] : [])], d.members.map((m) => [m.name, m.role, ...(d.members.some((x) => x.email) ? [m.email] : [])]), "Aucun membre.")}

<h2 id="conduite">Conduite</h2>
<p class="muted">${d.cues.length} cue${d.cues.length > 1 ? "s" : ""} · durée totale ${esc(formatDuration(totalSec))}</p>
${table(["N°", "Type", "Cue", "Départ (T+)", "Durée", "Notes"], d.cues.map((c) => [c.number, c.category, c.title, formatDuration(c.start), formatDuration(c.duration), c.notes]), "Aucune cue.")}

<h2 id="checklists">Checklists</h2>
${checklistHtml}

<h2 id="planning">Planning de montage</h2>
${table(["Jour", "Début", "Fin", "Tâche", "Qui", "Notes"], d.slots.map((x) => [x.day, x.start, x.end, x.title, x.who, x.notes]), "Aucun créneau.")}

<h2 id="charge">Charge électrique</h2>
<p class="muted">Total : ${esc(fmtWatts(d.power.total))} (estimation monophasée 230 V)</p>
${table(["Ligne", "Calibre", "Type", "Puissance", "Intensité max", "Charge"], d.power.circuits.map((c) => [c.name, `${c.breaker} A`, c.kind, fmtWatts(c.watts), `${fmtAmps(c.amps)} A`, `${c.pct} %${c.level === "over" ? " ⚠ surcharge" : c.level === "warn" ? " ⚠" : ""}`]), "Aucun circuit.")}
${table(["Appareil", "Qté", "Watts", "Ligne"], d.power.items.map((i) => [i.name, i.qty, i.watts, i.circuit]), "Aucun appareil.")}

<h2 id="lumiere">Patch lumière</h2>
${conflictCount ? `<p class="warn">⚠ ${conflictCount} projecteur${conflictCount > 1 ? "s" : ""} avec un conflit d'adresse.</p>` : ""}
${table(
  ["Circ.", "Projecteur", "Mode", "Patch", "Nb ch", "Position", "Gel", "Notes"],
  d.lights.map((l) => [l.channel, l.label, l.mode, patchLabel(l.universe, l.address), l.footprint, l.position, l.color, `${l.notes ?? ""}${d.conflicts.has(l.id) ? " ⚠ conflit d'adresse" : ""}`.trim()]),
  "Aucun projecteur.",
)}

<h2 id="son">Entrées son</h2>
${table(["Canal", "Source", "Micro / DI", "Pied", "Fantôme (+48 V)", "Notes"], d.inputs.map((r) => [r.channel, r.source, r.mic, r.stand, r.phantom ? "oui" : "", r.notes]), "Aucune entrée.")}

<h2 id="taches">Tâches (kanban)</h2>
${table(["Tâche", "Statut", "Priorité", "Assigné à", "Échéance", "Étiquettes"], d.tasks.map((t) => [t.title, t.status, t.priority, t.assignee, t.due, t.labels]), "Aucune tâche.")}
</body>
</html>
`;
}
