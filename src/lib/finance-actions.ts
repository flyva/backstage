"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  bdeAccountingAccounts, bdeBankAccounts, bdeBudgetForecasts, bdeFinancialEntries, bdeFiscalYears,
  FINANCE_CATEGORIES, FINANCE_DIRECTIONS,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { isDay } from "@/lib/alternance";
import { parseCsv } from "@/lib/csv";
import { fmtEuros } from "@/lib/finance";
import { getCurrentFiscalYear, getDefaultBankAccount } from "@/lib/finance-data";
import type { FormState } from "@/lib/actions";

const refresh = () => {
  revalidatePath("/admin/finances");
  revalidatePath("/admin/comptabilite-parametres");
};

const optionalId = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const entrySchema = z.object({
  direction: z.enum(FINANCE_DIRECTIONS),
  category: z.enum(FINANCE_CATEGORIES),
  label: z.string().trim().min(1, "Libellé requis").max(200),
  amount: z.coerce.number().positive("Montant : doit être supérieur à 0"),
  occurredOn: z.string().refine(isDay, "Date invalide"),
  method: z.string().trim().max(40),
  reference: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});

/** Créé ou met à jour une écriture comptable (recette/dépense du BDE). Même formulaire que l'outil Oasis,
 *  complété par le compte bancaire, le compte comptable et l'exercice (par défaut : ceux en cours). */
export async function saveFinancialEntry(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = entrySchema.safeParse({
    direction: fd.get("direction"),
    category: fd.get("category"),
    label: fd.get("label"),
    amount: fd.get("amount"),
    occurredOn: fd.get("occurredOn"),
    method: fd.get("method") ?? "",
    reference: fd.get("reference") ?? "",
    notes: fd.get("notes") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  const bankAccountId = optionalId(fd.get("bankAccountId")) ?? (await getDefaultBankAccount())?.id ?? null;
  const fiscalYearId = optionalId(fd.get("fiscalYearId")) ?? (await getCurrentFiscalYear())?.id ?? null;

  const values = {
    direction: p.data.direction,
    category: p.data.category,
    accountingAccountId: optionalId(fd.get("accountingAccountId")),
    bankAccountId,
    fiscalYearId,
    label: p.data.label,
    amountCents: Math.round(p.data.amount * 100),
    occurredOn: p.data.occurredOn,
    method: p.data.method || null,
    reference: p.data.reference || null,
    notes: p.data.notes || null,
  };

  const raw = Number(fd.get("id") || 0);
  const detail = `${p.data.label} (${fmtEuros(values.amountCents)})`;
  if (raw) {
    await db.update(bdeFinancialEntries).set(values).where(eq(bdeFinancialEntries.id, raw));
    await logAdminAction(admin.id, "finance-update", null, detail);
  } else {
    await db.insert(bdeFinancialEntries).values({ ...values, createdBy: admin.id });
    await logAdminAction(admin.id, "finance-create", null, detail);
  }
  refresh();
  redirect("/admin/finances");
}

export async function deleteFinancialEntry(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const [entry] = await db.select({ label: bdeFinancialEntries.label }).from(bdeFinancialEntries).where(eq(bdeFinancialEntries.id, id)).limit(1);
  await db.delete(bdeFinancialEntries).where(eq(bdeFinancialEntries.id, id));
  if (entry) await logAdminAction(admin.id, "finance-delete", null, entry.label);
  refresh();
}

// ---------- Comptes bancaires ----------

const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80),
  bankName: z.string().trim().max(120),
  balance: z.coerce.number(),
  balanceUpdatedAt: z.string().refine(isDay, "Date invalide"),
  isDefault: z.coerce.boolean(),
});

export async function saveBankAccount(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = bankAccountSchema.safeParse({
    name: fd.get("name"), bankName: fd.get("bankName") ?? "", balance: fd.get("balance"),
    balanceUpdatedAt: fd.get("balanceUpdatedAt"), isDefault: fd.get("isDefault") === "on",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  const values = {
    name: p.data.name, bankName: p.data.bankName || null,
    balanceCents: Math.round(p.data.balance * 100), balanceUpdatedAt: p.data.balanceUpdatedAt, isDefault: p.data.isDefault,
  };
  const raw = Number(fd.get("id") || 0);
  if (p.data.isDefault) await db.update(bdeBankAccounts).set({ isDefault: false });
  if (raw) await db.update(bdeBankAccounts).set(values).where(eq(bdeBankAccounts.id, raw));
  else await db.insert(bdeBankAccounts).values(values);
  await logAdminAction(admin.id, "finance-bank-account-save", null, p.data.name);
  revalidatePath("/admin/comptabilite-parametres");
  return { ok: "Compte enregistré." };
}

export async function deleteBankAccount(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.delete(bdeBankAccounts).where(eq(bdeBankAccounts.id, id));
  await logAdminAction(admin.id, "finance-bank-account-delete", null, String(id));
  revalidatePath("/admin/comptabilite-parametres");
}

// ---------- Plan comptable ----------

const accountingAccountSchema = z.object({
  number: z.string().trim().min(1, "Numéro requis").max(20),
  nameNormal: z.string().trim().min(1, "Nom normal requis").max(150),
  nameArranged: z.string().trim().min(1, "Nom simplifié requis").max(150),
});

export async function saveAccountingAccount(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = accountingAccountSchema.safeParse({ number: fd.get("number"), nameNormal: fd.get("nameNormal"), nameArranged: fd.get("nameArranged") });
  if (!p.success) return { error: p.error.issues[0].message };

  const raw = Number(fd.get("id") || 0);
  if (raw) await db.update(bdeAccountingAccounts).set(p.data).where(eq(bdeAccountingAccounts.id, raw));
  else await db.insert(bdeAccountingAccounts).values(p.data);
  await logAdminAction(admin.id, "finance-account-save", null, `${p.data.number} — ${p.data.nameNormal}`);
  revalidatePath("/admin/comptabilite-parametres/comptes");
  return { ok: "Compte comptable enregistré." };
}

export async function deleteAccountingAccount(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.delete(bdeAccountingAccounts).where(eq(bdeAccountingAccounts.id, id));
  await logAdminAction(admin.id, "finance-account-delete", null, String(id));
  revalidatePath("/admin/comptabilite-parametres/comptes");
}

// ---------- Exercices ----------

const fiscalYearSchema = z.object({
  label: z.string().trim().min(1, "Libellé requis").max(40),
  startDate: z.string().refine(isDay, "Date de début invalide"),
  endDate: z.string().refine(isDay, "Date de fin invalide"),
});

export async function saveFiscalYear(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = fiscalYearSchema.safeParse({ label: fd.get("label"), startDate: fd.get("startDate"), endDate: fd.get("endDate") });
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.endDate <= p.data.startDate) return { error: "La date de fin doit être après la date de début." };

  const raw = Number(fd.get("id") || 0);
  const makeCurrent = fd.get("isCurrent") === "on";
  if (makeCurrent) await db.update(bdeFiscalYears).set({ isCurrent: false });
  if (raw) await db.update(bdeFiscalYears).set({ ...p.data, ...(makeCurrent ? { isCurrent: true } : {}) }).where(eq(bdeFiscalYears.id, raw));
  else await db.insert(bdeFiscalYears).values({ ...p.data, isCurrent: makeCurrent });
  await logAdminAction(admin.id, "finance-fiscal-year-save", null, p.data.label);
  revalidatePath("/admin/comptabilite-parametres/exercices");
  revalidatePath("/admin/finances");
  return { ok: "Exercice enregistré." };
}

export async function setCurrentFiscalYear(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.update(bdeFiscalYears).set({ isCurrent: false });
  await db.update(bdeFiscalYears).set({ isCurrent: true }).where(eq(bdeFiscalYears.id, id));
  await logAdminAction(admin.id, "finance-fiscal-year-set-current", null, String(id));
  revalidatePath("/admin/comptabilite-parametres/exercices");
  revalidatePath("/admin/finances");
}

export async function deleteFiscalYear(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.delete(bdeFiscalYears).where(eq(bdeFiscalYears.id, id));
  await logAdminAction(admin.id, "finance-fiscal-year-delete", null, String(id));
  revalidatePath("/admin/comptabilite-parametres/exercices");
}

// ---------- Prévisionnel ----------

const forecastSchema = z.object({
  fiscalYearId: z.coerce.number().int().positive(),
  accountingAccountId: z.coerce.number().int().positive(),
  direction: z.enum(FINANCE_DIRECTIONS),
  amount: z.coerce.number().min(0),
  notes: z.string().trim().max(500),
});

export async function saveBudgetForecast(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = forecastSchema.safeParse({
    fiscalYearId: fd.get("fiscalYearId"), accountingAccountId: fd.get("accountingAccountId"),
    direction: fd.get("direction"), amount: fd.get("amount"), notes: fd.get("notes") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  const values = {
    fiscalYearId: p.data.fiscalYearId, accountingAccountId: p.data.accountingAccountId,
    direction: p.data.direction, amountCents: Math.round(p.data.amount * 100), notes: p.data.notes || null,
  };
  const raw = Number(fd.get("id") || 0);
  if (raw) await db.update(bdeBudgetForecasts).set(values).where(eq(bdeBudgetForecasts.id, raw));
  else await db.insert(bdeBudgetForecasts).values(values);
  await logAdminAction(admin.id, "finance-forecast-save", null, fmtEuros(values.amountCents));
  revalidatePath("/admin/finances/previsionnel");
  return { ok: "Ligne prévisionnelle enregistrée." };
}

export async function deleteBudgetForecast(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.delete(bdeBudgetForecasts).where(eq(bdeBudgetForecasts.id, id));
  await logAdminAction(admin.id, "finance-forecast-delete", null, String(id));
  revalidatePath("/admin/finances/previsionnel");
}

// ---------- Import CSV ----------

/** Parse un CSV simple : date;libellé;sens;montant;numéro de compte;compte bancaire;référence;moyen;notes */
export async function importFinancialEntriesCsv(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis un fichier CSV." };
  const fiscalYearId = optionalId(fd.get("fiscalYearId")) ?? (await getCurrentFiscalYear())?.id ?? null;
  const defaultBankAccountId = optionalId(fd.get("bankAccountId")) ?? (await getDefaultBankAccount())?.id ?? null;

  const text = await file.text();
  const accounts = await db.select().from(bdeAccountingAccounts);
  const accountByNumber = new Map(accounts.map((a) => [a.number, a.id]));

  let lines = parseCsv(text);
  if (lines[0]?.[0]?.toLowerCase().startsWith("date")) lines = lines.slice(1); // en-tête facultative

  const rows: (typeof bdeFinancialEntries.$inferInsert)[] = [];
  const errors: string[] = [];
  lines.forEach((cols, i) => {
    const [date, label, direction, amount, accountNumber, , reference, method, notes] = cols.map((c) => c?.trim() ?? "");
    if (!isDay(date) || !label || !amount) { errors.push(`Ligne ${i + 1} : incomplète.`); return; }
    const dir = direction?.toLowerCase().startsWith("rec") ? "income" : "expense";
    const cents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { errors.push(`Ligne ${i + 1} : montant invalide.`); return; }
    rows.push({
      direction: dir, category: "autre", label: label.slice(0, 200),
      accountingAccountId: accountByNumber.get(accountNumber) ?? null,
      bankAccountId: defaultBankAccountId, fiscalYearId,
      amountCents: cents, occurredOn: date, method: method || null, reference: reference || null, notes: notes || null,
      createdBy: admin.id,
    });
  });

  if (rows.length === 0) return { error: errors[0] ?? "Aucune ligne valide dans le fichier." };
  await db.insert(bdeFinancialEntries).values(rows);
  await logAdminAction(admin.id, "finance-import-csv", null, `${rows.length} écriture(s) importée(s)`);
  refresh();
  return { ok: `${rows.length} écriture(s) importée(s)${errors.length ? `, ${errors.length} ligne(s) ignorée(s)` : ""}.` };
}
