// Lectures partagées pour la comptabilité BDE (comptes bancaires, plan comptable, exercices).
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bdeAccountingAccounts, bdeBankAccounts, bdeFiscalYears } from "@/db/schema";

export async function getFiscalYears() {
  return db.select().from(bdeFiscalYears).orderBy(desc(bdeFiscalYears.startDate));
}

export async function getCurrentFiscalYear() {
  const [current] = await db.select().from(bdeFiscalYears).where(eq(bdeFiscalYears.isCurrent, true)).limit(1);
  if (current) return current;
  const [latest] = await db.select().from(bdeFiscalYears).orderBy(desc(bdeFiscalYears.startDate)).limit(1);
  return latest ?? null;
}

export async function getBankAccounts() {
  return db.select().from(bdeBankAccounts).orderBy(desc(bdeBankAccounts.isDefault), bdeBankAccounts.name);
}

export async function getDefaultBankAccount() {
  const [def] = await db.select().from(bdeBankAccounts).where(eq(bdeBankAccounts.isDefault, true)).limit(1);
  if (def) return def;
  const [any] = await db.select().from(bdeBankAccounts).limit(1);
  return any ?? null;
}

export async function getAccountingAccounts() {
  return db.select().from(bdeAccountingAccounts).orderBy(bdeAccountingAccounts.number);
}
