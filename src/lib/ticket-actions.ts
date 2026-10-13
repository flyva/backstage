"use server";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ticketComments, ticketFiles, tickets, TICKET_STATUSES, type TicketStatus } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/actions";
import {
  MAX_TICKET_FILE_BYTES, MAX_TICKET_FILES, ensureTicketFilesDir, newTicketFileName, removeTicketFile, sniff, ticketFilesDir,
} from "@/lib/ticket-files";

const ticketSchema = z.object({
  title: z.string().trim().min(3, "Titre requis (3 caractères minimum)").max(150),
  body: z.string().trim().min(5, "Décris le problème (5 caractères minimum)").max(5000),
});

/** Un ticket n'est visible que par son auteur ou un administrateur. */
async function loadVisibleTicket(id: number, userId: number, admin: boolean) {
  const [row] = await db.select().from(tickets).where(admin ? eq(tickets.id, id) : and(eq(tickets.id, id), eq(tickets.createdBy, userId))).limit(1);
  return row ?? null;
}

export async function createTicket(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = ticketSchema.safeParse({ title: fd.get("title"), body: fd.get("body") });
  if (!p.success) return { error: p.error.issues[0].message };

  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_TICKET_FILES) return { error: `${MAX_TICKET_FILES} fichiers maximum` };
  for (const f of files) {
    if (f.size > MAX_TICKET_FILE_BYTES) return { error: `« ${f.name} » dépasse 15 Mo` };
  }

  const [res] = await db.insert(tickets).values({ title: p.data.title, body: p.data.body, createdBy: user.id, lastActorId: user.id, ownerReadAt: new Date() });

  if (files.length > 0) {
    await ensureTicketFilesDir();
    for (const f of files) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const kind = sniff(bytes);
      if (!kind) continue; // format non reconnu : ignoré plutôt que de bloquer tout le ticket
      const name = newTicketFileName(kind.ext);
      await writeFile(path.join(ticketFilesDir(), name), bytes);
      const original = f.name.replace(/[\u0000-\u001f\\/]/g, "_").slice(0, 200) || `fichier.${kind.ext}`;
      await db.insert(ticketFiles).values({ ticketId: res.insertId, file: name, originalName: original, mime: kind.mime, size: bytes.length, uploadedBy: user.id });
    }
  }
  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  redirect(`/tickets/${res.insertId}`);
}

export async function addTicketComment(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = Number(fd.get("ticketId"));
  if (!Number.isInteger(id)) return { error: "Ticket introuvable" };
  const ticket = await loadVisibleTicket(id, user.id, user.perms.administration);
  if (!ticket) return { error: "Ticket introuvable" };
  const body = String(fd.get("body") ?? "").trim();
  if (!body || body.length > 3000) return { error: "Message vide ou trop long" };
  await db.insert(ticketComments).values({ ticketId: id, userId: user.id, body });
  // Si c'est l'auteur qui répond, son ticket reste « lu » pour lui ; si c'est un admin, l'auteur aura une réponse à lire.
  await db.update(tickets).set({ updatedAt: new Date(), lastActorId: user.id, ...(user.id === ticket.createdBy ? { ownerReadAt: new Date() } : {}) }).where(eq(tickets.id, id));
  revalidatePath(`/tickets/${id}`);
  revalidatePath("/admin/tickets");
  return { ok: "Message ajouté" };
}

export async function setTicketStatus(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("ticketId"));
  const status = String(fd.get("status") ?? "") as TicketStatus;
  if (!Number.isInteger(id) || !TICKET_STATUSES.includes(status)) return;
  await db.update(tickets).set({ status, updatedAt: new Date(), lastActorId: admin.id }).where(eq(tickets.id, id));
  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
}

export async function deleteTicketFile(fd: FormData) {
  const user = await requireUser();
  const fileId = Number(fd.get("fileId"));
  const ticketId = Number(fd.get("ticketId"));
  if (!Number.isInteger(fileId) || !Number.isInteger(ticketId)) return;
  const ticket = await loadVisibleTicket(ticketId, user.id, user.perms.administration);
  if (!ticket) return;
  const [file] = await db.select().from(ticketFiles).where(and(eq(ticketFiles.id, fileId), eq(ticketFiles.ticketId, ticketId))).limit(1);
  if (!file) return;
  await db.delete(ticketFiles).where(eq(ticketFiles.id, fileId));
  await removeTicketFile(file.file);
  revalidatePath(`/tickets/${ticketId}`);
}
