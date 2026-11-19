"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bdeOfficerTitles, BDE_STATUSES, settings, users, type BdeStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import type { FormState } from "@/lib/actions";

const refresh = () => {
  revalidatePath("/admin/association");
  revalidatePath("/bde/organigramme");
};

async function setSetting(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

const infoSchema = z.object({
  rna: z.string().trim().max(20),
  titre: z.string().trim().max(150),
  adresseSiege: z.string().trim().max(300),
  adresseGestion: z.string().trim().max(300),
  siren: z.string().trim().regex(/^$|^\d{9}$/, "Le SIREN doit comporter 9 chiffres"),
  siret: z.string().trim().regex(/^$|^\d{14}$/, "Le SIRET doit comporter 14 chiffres"),
});

/** Enregistre la fiche officielle de l'association (RNA, titre, adresses, SIREN/SIRET). */
export async function saveAssociationInfo(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = infoSchema.safeParse({
    rna: fd.get("rna"), titre: fd.get("titre"), adresseSiege: fd.get("adresseSiege"),
    adresseGestion: fd.get("adresseGestion"), siren: fd.get("siren"), siret: fd.get("siret"),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  await Promise.all([
    setSetting("asso_rna", p.data.rna),
    setSetting("asso_titre", p.data.titre),
    setSetting("asso_adresse_siege", p.data.adresseSiege),
    setSetting("asso_adresse_gestion", p.data.adresseGestion),
    setSetting("asso_siren", p.data.siren),
    setSetting("asso_siret", p.data.siret),
  ]);
  refresh();
  return { ok: "Fiche association enregistrée." };
}

const DOC_KEYS = { recu_rna: "asso_doc_recu_rna", lettre_intention: "asso_doc_lettre_intention" } as const;

/** Dépose (ou remplace) un document officiel de l'association, en PDF, pour impression/export. */
export async function saveAssociationDoc(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const which = String(fd.get("which") ?? "");
  if (!(which in DOC_KEYS)) return { error: "Document inconnu" };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis un fichier PDF." };
  if (file.type !== "application/pdf") return { error: "Le fichier doit être un PDF." };
  if (file.size > 10 * 1024 * 1024) return { error: "Fichier trop lourd (10 Mo max)." };

  const name = `asso-${which.replace(/_/g, "-")}-${randomBytes(6).toString("hex")}.pdf`;
  const dir = path.join(process.cwd(), "data", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  await setSetting(DOC_KEYS[which as keyof typeof DOC_KEYS], name);
  refresh();
  return { ok: "Document enregistré." };
}

const roleSchema = z.object({
  userId: z.coerce.number().int().positive(),
  bdeStatus: z.union([z.enum(BDE_STATUSES), z.literal("")]),
  bdeTitle: z.string().trim().max(80),
});

/** Statut BDE d'une personne (liste / CA / bureau + qualification) : visible de tous, édition réservée aux admins.
 *  Toute nouvelle qualification saisie est conservée dans la liste des titres, pour l'autocomplétion future. */
export async function saveUserBdeRole(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = roleSchema.safeParse({ userId: fd.get("userId"), bdeStatus: fd.get("bdeStatus") ?? "", bdeTitle: fd.get("bdeTitle") ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const bdeStatus: BdeStatus | null = p.data.bdeStatus || null;
  const bdeTitle = bdeStatus === "bureau" ? (p.data.bdeTitle || null) : null;
  if (bdeStatus === "bureau" && !bdeTitle) return { error: "Choisis ou saisis une qualification pour ce membre du bureau." };

  const [target] = await db.select({ name: users.name }).from(users).where(eq(users.id, p.data.userId)).limit(1);
  if (!target) return { error: "Personne introuvable" };

  await db.update(users).set({ bdeStatus, bdeTitle }).where(eq(users.id, p.data.userId));
  if (bdeTitle) await db.insert(bdeOfficerTitles).values({ label: bdeTitle }).onDuplicateKeyUpdate({ set: { label: bdeTitle } });
  await logAdminAction(admin.id, "bde-role-update", p.data.userId, `${target.name} → ${bdeStatus ?? "aucun"}${bdeTitle ? ` (${bdeTitle})` : ""}`);
  revalidatePath(`/admin/utilisateurs/${p.data.userId}`);
  revalidatePath("/bde/organigramme");
  return { ok: "Statut BDE enregistré." };
}
