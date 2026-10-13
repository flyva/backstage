"use server";

import { revalidatePath } from "next/cache";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { requireAdmin } from "@/lib/auth";
import { sniffAvatar } from "@/lib/avatar-files";
import { siteIconDir, siteIconMaskablePath, siteIconPath } from "@/lib/site-icon";
import type { FormState } from "@/lib/actions";

const MAX_BYTES = 400 * 1024;

async function readPng(fd: FormData, field: string): Promise<Uint8Array | null> {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("Image trop lourde");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniffAvatar(bytes)?.ext !== "png") throw new Error("Image PNG attendue");
  return bytes;
}

/**
 * Remplace l'icône du site : deux versions préparées par le navigateur (même logo) — « icon » en plein cadre (onglet,
 * iOS) et « maskable » avec marge de sécurité sur fond plein (Android découpe cette version selon la forme du
 * launcher ; sans marge, un logo qui touche les bords se retrouve rogné une fois l'app installée). Réservé aux admins.
 */
export async function saveSiteIcon(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  let icon: Uint8Array | null, maskable: Uint8Array | null;
  try {
    [icon, maskable] = await Promise.all([readPng(fd, "icon"), readPng(fd, "maskable")]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image invalide" };
  }
  if (!icon || !maskable) return { error: "Choisis une image" };
  await mkdir(siteIconDir(), { recursive: true });
  await Promise.all([writeFile(siteIconPath(), icon), writeFile(siteIconMaskablePath(), maskable)]);
  revalidatePath("/", "layout");
  return { ok: "Icône enregistrée. Les navigateurs peuvent mettre quelques minutes à la rafraîchir." };
}

export async function resetSiteIcon() {
  await requireAdmin();
  await Promise.all([rm(siteIconPath(), { force: true }), rm(siteIconMaskablePath(), { force: true })]);
  revalidatePath("/", "layout");
}
