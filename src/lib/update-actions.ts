"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { UPDATE_KINDS, updates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { notifyCategory } from "@/lib/push";
import type { FormState } from "@/lib/actions";

const id = z.coerce.number().int().positive();
const updateSchema = z.object({
  title: z.string().trim().min(2, "Titre requis").max(150),
  body: z.string().trim().min(2, "Texte requis").max(4000),
  kind: z.enum(UPDATE_KINDS),
  important: z.boolean(),
  publishUntil: z.string().trim().max(10).refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide"),
});
const refresh = () => {
  revalidatePath("/nouveautes");
  revalidatePath("/admin/nouveautes");
  revalidatePath("/", "layout"); // la cloche (dans le menu) reprend les dernières nouveautés
};

export async function saveUpdate(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = updateSchema.safeParse({
    title: fd.get("title"),
    body: fd.get("body"),
    kind: fd.get("kind") || "feature",
    important: fd.get("important") === "on",
    publishUntil: fd.get("publishUntil") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  // Jusqu'à la fin de la journée choisie (incluse), pour que la nouveauté reste visible toute la journée de la date limite.
  const values = {
    title: p.data.title, body: p.data.body, kind: p.data.kind, important: p.data.important,
    publishUntil: p.data.publishUntil ? new Date(`${p.data.publishUntil}T23:59:59`) : null,
  };
  const raw = fd.get("id");
  if (raw) {
    await db.update(updates).set(values).where(eq(updates.id, id.parse(raw)));
  } else {
    await db.insert(updates).values({ ...values, authorId: admin.id });
    // Marquée importante : en plus de la cloche, une notification push à qui l'a activé dans ses réglages.
    if (p.data.important) await notifyCategory("updates", { title: `Nouveauté : ${p.data.title}`, body: p.data.body.slice(0, 180), url: "/nouveautes", tag: "update" }, admin.id).catch(() => 0);
  }
  refresh();
  return { ok: raw ? "Nouveauté enregistrée" : "Nouveauté publiée" };
}

export async function deleteUpdate(fd: FormData) {
  await requireAdmin();
  await db.delete(updates).where(eq(updates.id, id.parse(fd.get("id"))));
  refresh();
}
