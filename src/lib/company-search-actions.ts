"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, like, or } from "drizzle-orm";
import { db } from "@/db";
import { altCompanies, altCompanySearches, companyContacts, companyInterviews, companyStatuses, CONTACT_TYPES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { companyKey, parseCsv, parseDelay, parseFrDate, parseKind, parsePriority, parseStatus, parseTypes, type CompanyMatch } from "@/lib/company-search";
import type { FormState } from "@/lib/actions";

const refresh = () => revalidatePath("/recherche-entreprises");

/** Recherche dans l'annuaire par nom, téléphone ou email, pour l'autocomplétion du formulaire « Ajouter une entreprise ». */
export async function searchCompaniesByQuery(q: string): Promise<CompanyMatch[]> {
  const user = await requireUser();
  const term = q.trim();
  if (term.length < 2) return [];
  const like_ = `%${term}%`;
  const rows = await db.select().from(altCompanies)
    .where(and(
      or(like(altCompanies.name, like_), like(altCompanies.phone, like_), like(altCompanies.email, like_)),
      or(eq(altCompanies.published, true), eq(altCompanies.createdByUserId, user.id)),
    ))
    .limit(8);
  return rows.map((c) => ({
    id: c.id, name: c.name, city: c.city, department: c.department, sector: c.sector, address: c.address, types: c.types,
    salary: c.salary, sources: c.sources, perks: c.perks, contactTitle: c.contactTitle, contactName: c.contactName, phone: c.phone, email: c.email,
  }));
}

/** Ajoute plusieurs entreprises d'un coup à MON tableau (cases cochées dans l'annuaire), chacune avec une ligne de
 * suivi vide. Ignore celles déjà présentes dans mon tableau. */
export async function bulkAddToBoard(companyIds: number[]) {
  const user = await requireUser();
  const ids = [...new Set(companyIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (ids.length === 0) return;
  const existing = await db.select({ companyId: altCompanySearches.companyId }).from(altCompanySearches)
    .where(and(eq(altCompanySearches.userId, user.id), inArray(altCompanySearches.companyId, ids)));
  const already = new Set(existing.map((e) => e.companyId));
  const toAdd = ids.filter((id) => !already.has(id));
  if (toAdd.length) await db.insert(altCompanySearches).values(toAdd.map((companyId) => ({ companyId, userId: user.id })));
  refresh();
}

/** Publie dans l'annuaire PARTAGÉ une ou plusieurs entreprises qui n'étaient visibles que dans mon tableau (import
 * CSV ou ajout manuel) : seulement celles que j'ai créées (ou un administrateur, pour toutes). */
export async function publishCompanies(companyIds: number[]) {
  const user = await requireUser();
  const ids = [...new Set(companyIds.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (ids.length === 0) return;
  const rows = await db.select({ id: altCompanies.id, createdByUserId: altCompanies.createdByUserId }).from(altCompanies).where(inArray(altCompanies.id, ids));
  const allowed = rows.filter((r) => user.perms.admin || r.createdByUserId === user.id).map((r) => r.id);
  if (allowed.length) await db.update(altCompanies).set({ published: true }).where(inArray(altCompanies.id, allowed));
  refresh();
  revalidatePath("/recherche-entreprises/annuaire");
}

/** Retire une entreprise de MON tableau (l'entreprise reste dans l'annuaire partagé pour tout le monde). */
export async function removeFromBoard(fd: FormData) {
  const user = await requireUser();
  const companyId = Number(fd.get("companyId"));
  if (!companyId) return;
  await db.delete(altCompanySearches).where(and(eq(altCompanySearches.companyId, companyId), eq(altCompanySearches.userId, user.id)));
  refresh();
}

/** Supprime une entreprise de l'annuaire PARTAGÉ (et donc du tableau de tout le monde) : seulement permis à la
 * personne qui l'a ajoutée (ou un administrateur), pour éviter qu'on retire une fiche que d'autres utilisent. */
export async function deleteCompany(fd: FormData) {
  const user = await requireUser();
  const companyId = Number(fd.get("companyId"));
  if (!companyId) return;
  const [company] = await db.select({ createdByUserId: altCompanies.createdByUserId }).from(altCompanies).where(eq(altCompanies.id, companyId)).limit(1);
  if (!company) return;
  if (company.createdByUserId !== user.id && !user.perms.admin) return;
  await db.delete(altCompanies).where(eq(altCompanies.id, companyId)); // efface aussi alt_company_searches de tout le monde (ON DELETE CASCADE)
  refresh();
  revalidatePath("/recherche-entreprises/annuaire");
}

const EDITABLE_FIELDS = ["kind", "status", "priority", "lastContactDate", "delayDays", "note"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

/** Modifie UN champ d'UNE ligne de suivi (cellule éditée dans le tableau, soumission auto au changement). */
export async function saveSearchField(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const field = String(fd.get("field") ?? "");
  const raw = String(fd.get("value") ?? "").trim();
  if (!id || !EDITABLE_FIELDS.includes(field as EditableField)) return;
  const [row] = await db.select({ userId: altCompanySearches.userId }).from(altCompanySearches).where(eq(altCompanySearches.id, id)).limit(1);
  if (!row || row.userId !== user.id) return;

  let value: string | number | null = raw || null;
  if (field === "kind" && raw && !["offre", "spontanee"].includes(raw)) return;
  if (field === "status" && raw) {
    const [known] = await db.select({ key: companyStatuses.key }).from(companyStatuses).where(eq(companyStatuses.key, raw)).limit(1);
    if (!known) return;
  }
  if (field === "priority" && raw && !["faible", "moyenne", "haute"].includes(raw)) return;
  if (field === "delayDays") value = raw ? Math.round(Number(raw)) : null;
  if (field === "note") value = raw.slice(0, 2000);
  if (field === "lastContactDate" && raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;

  const values: Record<string, string | number | null> = { [field]: value };
  // On touche à la date ou au délai : si un rappel était déjà parti pour l'ancienne échéance, on le rearme pour la nouvelle.
  if (field === "lastContactDate" || field === "delayDays") values.delayAlertSentAt = null;
  await db.update(altCompanySearches).set(values).where(eq(altCompanySearches.id, id));
  refresh();
}

const typesSchema = (fd: FormData) => ["son", "lumiere", "video"].filter((t) => fd.get(`type_${t}`)).join(",");

/** Crée une nouvelle entreprise dans l'annuaire partagé (ou réutilise celle qui existe déjà sous ce nom/ville), et l'ajoute à mon tableau. */
export async function createCompany(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(fd.get("name") ?? "").trim();
  const city = String(fd.get("city") ?? "").trim();
  if (!name) return { error: "Le nom de l'entreprise est obligatoire" };
  const nameKey = companyKey(name, city);

  const [existing] = await db.select({ id: altCompanies.id }).from(altCompanies).where(eq(altCompanies.nameKey, nameKey)).limit(1);
  let companyId = existing?.id;
  if (!companyId) {
    const [res] = await db.insert(altCompanies).values({
      name, nameKey, city,
      department: String(fd.get("department") ?? "").trim(),
      sector: String(fd.get("sector") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
      types: typesSchema(fd),
      contactTitle: String(fd.get("contactTitle") ?? "").trim(),
      contactName: String(fd.get("contactName") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      createdByUserId: user.id,
      published: false,
    });
    companyId = res.insertId;
  }
  const [inBoard] = await db.select({ id: altCompanySearches.id }).from(altCompanySearches)
    .where(and(eq(altCompanySearches.companyId, companyId), eq(altCompanySearches.userId, user.id))).limit(1);
  if (!inBoard) await db.insert(altCompanySearches).values({ companyId, userId: user.id });

  refresh();
  return { ok: existing ? "Entreprise déjà connue : ajoutée à ton tableau" : "Ajoutée à ton tableau — publie-la dans l'annuaire quand tu es prêt" };
}

/** Import CSV (format du tableur d'origine, colonnes dans l'ordre : Ok,ville,Departement,Secteur,adresse,Type,Salaire,
 * Souces,avantage,Titre contact,Contact,Tel,Mail,Offre / spontanée,Date dernier contact,Statuts,Priorité,Date entretiens,Observation,Délais).
 * Tout atterrit dans MON tableau : les entreprises nouvellement créées ne sont PAS publiées dans l'annuaire (je les
 * vérifie d'abord, je publie ensuite celles que je veux depuis mon tableau). Dédupliquées par nom+ville, y compris
 * avec des entreprises déjà publiées par d'autres. */
export async function importCompaniesCsv(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis un fichier CSV" };
  if (file.size > 5 * 1024 * 1024) return { error: "Fichier trop volumineux (5 Mo max)" };
  const text = await file.text();
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()));
  if (rows.length < 2) return { error: "Fichier vide ou illisible" };
  rows.shift(); // en-têtes

  const existingCompanies = await db.select({ id: altCompanies.id, nameKey: altCompanies.nameKey }).from(altCompanies);
  const companyByKey = new Map(existingCompanies.map((c) => [c.nameKey, c.id]));
  const existingSearches = await db.select({ id: altCompanySearches.id, companyId: altCompanySearches.companyId }).from(altCompanySearches)
    .where(eq(altCompanySearches.userId, user.id));
  const searchByCompany = new Map(existingSearches.map((s) => [s.companyId, s.id]));

  let newCompanies = 0, imported = 0, skipped = 0;
  for (const cells of rows) {
    const get = (i: number) => (cells[i] ?? "").trim();
    const name = get(0);
    if (!name) { skipped++; continue; }
    const city = get(1);
    const nameKey = companyKey(name, city);

    let companyId = companyByKey.get(nameKey);
    if (!companyId) {
      const [res] = await db.insert(altCompanies).values({
        name, nameKey, city,
        department: get(2), sector: get(3), address: get(4), types: parseTypes(get(5)),
        salary: get(6), sources: get(7), perks: get(8),
        contactTitle: get(9), contactName: get(10), phone: get(11), email: get(12),
        createdByUserId: user.id, published: false,
      });
      companyId = res.insertId;
      companyByKey.set(nameKey, companyId);
      newCompanies++;
    }

    const values = {
      kind: parseKind(get(13)), lastContactDate: parseFrDate(get(14)), status: parseStatus(get(15)),
      priority: parsePriority(get(16)), note: get(18).slice(0, 2000), delayDays: parseDelay(get(19)),
    };
    let searchId = searchByCompany.get(companyId);
    if (searchId) await db.update(altCompanySearches).set(values).where(eq(altCompanySearches.id, searchId));
    else {
      const [res] = await db.insert(altCompanySearches).values({ companyId, userId: user.id, ...values });
      searchId = res.insertId;
      searchByCompany.set(companyId, searchId);
    }
    const interviewDate = parseFrDate(get(17));
    if (interviewDate) await db.insert(companyInterviews).values({ searchId, interviewDate });
    imported++;
  }

  refresh();
  return { ok: `${imported} entreprise(s) importée(s) dans ton tableau${newCompanies ? ` (${newCompanies} nouvelle(s), à publier toi-même dans l'annuaire si tu veux)` : ""}${skipped ? `, ${skipped} ligne(s) ignorée(s)` : ""}` };
}

/** Vérifie que la ligne de suivi `searchId` appartient bien à l'utilisateur connecté, et la renvoie. */
async function myVerifiedSearch(searchId: number, userId: number) {
  const [row] = await db.select({ id: altCompanySearches.id }).from(altCompanySearches)
    .where(and(eq(altCompanySearches.id, searchId), eq(altCompanySearches.userId, userId))).limit(1);
  return row;
}

const refreshDetail = (searchId: number) => revalidatePath(`/recherche-entreprises/suivi/${searchId}`);

/** Ajoute une entrée à l'historique de contact (appel / mail / physique) d'une ligne de suivi : vrai CRM, avec
 * commentaire. Met aussi à jour lastContactDate si cette date est plus récente, et réarme le rappel de délai. */
export async function addContact(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const searchId = Number(fd.get("searchId"));
  const type = String(fd.get("type") ?? "");
  const contactDate = String(fd.get("contactDate") ?? "").trim();
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 2000);
  if (!searchId || !CONTACT_TYPES.includes(type as (typeof CONTACT_TYPES)[number])) return { error: "Champs invalides" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(contactDate)) return { error: "Date invalide" };
  if (!(await myVerifiedSearch(searchId, user.id))) return { error: "Introuvable" };

  await db.insert(companyContacts).values({ searchId, type: type as (typeof CONTACT_TYPES)[number], contactDate, comment });
  const [row] = await db.select({ lastContactDate: altCompanySearches.lastContactDate }).from(altCompanySearches).where(eq(altCompanySearches.id, searchId)).limit(1);
  if (!row?.lastContactDate || contactDate > row.lastContactDate) {
    await db.update(altCompanySearches).set({ lastContactDate: contactDate, delayAlertSentAt: null }).where(eq(altCompanySearches.id, searchId));
  }
  refresh();
  refreshDetail(searchId);
  return { ok: "Contact ajouté" };
}

/** Supprime une entrée de l'historique de contact (seulement la mienne). */
export async function deleteContact(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const searchId = Number(fd.get("searchId"));
  if (!id || !searchId || !(await myVerifiedSearch(searchId, user.id))) return;
  await db.delete(companyContacts).where(and(eq(companyContacts.id, id), eq(companyContacts.searchId, searchId)));
  refresh();
  refreshDetail(searchId);
}

/** Ajoute un entretien à une ligne de suivi (plusieurs entretiens possibles pour une même candidature). */
export async function addInterview(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const searchId = Number(fd.get("searchId"));
  const interviewDate = String(fd.get("interviewDate") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim().slice(0, 255);
  if (!searchId || !/^\d{4}-\d{2}-\d{2}$/.test(interviewDate)) return { error: "Date invalide" };
  if (!(await myVerifiedSearch(searchId, user.id))) return { error: "Introuvable" };

  await db.insert(companyInterviews).values({ searchId, interviewDate, note });
  refresh();
  refreshDetail(searchId);
  return { ok: "Entretien ajouté" };
}

/** Supprime un entretien (seulement le mien). */
export async function deleteInterview(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const searchId = Number(fd.get("searchId"));
  if (!id || !searchId || !(await myVerifiedSearch(searchId, user.id))) return;
  await db.delete(companyInterviews).where(and(eq(companyInterviews.id, id), eq(companyInterviews.searchId, searchId)));
  refresh();
  refreshDetail(searchId);
}
