"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, like, or } from "drizzle-orm";
import { db } from "@/db";
import { ALT_COMPANY_STATUSES, altCompanies, altCompanySearches } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { companyKey, parseCsv, parseDelay, parseFrDate, parseKind, parsePriority, parseStatus, parseTypes, type CompanyMatch } from "@/lib/company-search";
import type { FormState } from "@/lib/actions";

const refresh = () => revalidatePath("/recherche-entreprises");

/** Recherche dans l'annuaire par nom, téléphone ou email, pour l'autocomplétion du formulaire « Ajouter une entreprise ». */
export async function searchCompaniesByQuery(q: string): Promise<CompanyMatch[]> {
  await requireUser();
  const term = q.trim();
  if (term.length < 2) return [];
  const like_ = `%${term}%`;
  const rows = await db.select().from(altCompanies)
    .where(or(like(altCompanies.name, like_), like(altCompanies.phone, like_), like(altCompanies.email, like_)))
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

const EDITABLE_FIELDS = ["kind", "status", "priority", "lastContactDate", "interviewDate", "delayDays", "note"] as const;
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
  if (field === "status" && raw && !(ALT_COMPANY_STATUSES as readonly string[]).includes(raw)) return;
  if (field === "priority" && raw && !["faible", "moyenne", "haute"].includes(raw)) return;
  if (field === "delayDays") value = raw ? Math.round(Number(raw)) : null;
  if (field === "note") value = raw.slice(0, 2000);
  if ((field === "lastContactDate" || field === "interviewDate") && raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;

  await db.update(altCompanySearches).set({ [field]: value }).where(eq(altCompanySearches.id, id));
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
    });
    companyId = res.insertId;
  }
  const [inBoard] = await db.select({ id: altCompanySearches.id }).from(altCompanySearches)
    .where(and(eq(altCompanySearches.companyId, companyId), eq(altCompanySearches.userId, user.id))).limit(1);
  if (!inBoard) await db.insert(altCompanySearches).values({ companyId, userId: user.id });

  refresh();
  return { ok: existing ? "Entreprise déjà dans l'annuaire : ajoutée à ton tableau" : "Entreprise ajoutée" };
}

/** Import CSV (format du tableur d'origine, colonnes dans l'ordre : Ok,ville,Departement,Secteur,adresse,Type,Salaire,
 * Souces,avantage,Titre contact,Contact,Tel,Mail,Offre / spontanée,Date dernier contact,Statuts,Priorité,Date entretiens,Observation,Délais).
 * Les entreprises rejoignent l'annuaire PARTAGÉ (dédupliquées par nom+ville) ; le suivi (statut, priorité…) va dans
 * MON tableau à moi, jamais celui des autres. */
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
        createdByUserId: user.id,
      });
      companyId = res.insertId;
      companyByKey.set(nameKey, companyId);
      newCompanies++;
    }

    const values = {
      kind: parseKind(get(13)), lastContactDate: parseFrDate(get(14)), status: parseStatus(get(15)),
      priority: parsePriority(get(16)), interviewDate: parseFrDate(get(17)), note: get(18).slice(0, 2000), delayDays: parseDelay(get(19)),
    };
    const searchId = searchByCompany.get(companyId);
    if (searchId) await db.update(altCompanySearches).set(values).where(eq(altCompanySearches.id, searchId));
    else {
      const [res] = await db.insert(altCompanySearches).values({ companyId, userId: user.id, ...values });
      searchByCompany.set(companyId, res.insertId);
    }
    imported++;
  }

  refresh();
  return { ok: `${imported} entreprise(s) importée(s) dans ton tableau${newCompanies ? ` (${newCompanies} nouvelle(s) dans l'annuaire)` : ""}${skipped ? `, ${skipped} ligne(s) ignorée(s)` : ""}` };
}
