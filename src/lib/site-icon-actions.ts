"use server";

import { revalidatePath } from "next/cache";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { requireAdmin } from "@/lib/auth";
import { sniffAvatar } from "@/lib/avatar-files";
import { siteIconDir, siteIconPath } from "@/lib/site-icon";
import type { FormState } from "@/lib/actions";

const MAX_BYTES = 400 * 1024;

/** Remplace l'icône du site (PNG carré, préparé par le navigateur). Réservé aux administrateurs. */
export async function saveSiteIcon(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const file = fd.get("icon");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis une image" };
  if (file.size > MAX_BYTES) return { error: "Image trop lourde" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniffAvatar(bytes)?.ext !== "png") return { error: "Image PNG attendue" };
  await mkdir(siteIconDir(), { recursive: true });
  await writeFile(siteIconPath(), bytes);
  revalidatePath("/", "layout");
  return { ok: "Icône enregistrée. Les navigateurs peuvent mettre quelques minutes à la rafraîchir." };
}

export async function resetSiteIcon() {
  await requireAdmin();
  await rm(siteIconPath(), { force: true });
  revalidatePath("/", "layout");
}
