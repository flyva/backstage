import "server-only";
import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export { sniff } from "@/lib/project-files";

export const MAX_TICKET_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_TICKET_FILES = 5;

export const ticketFilesDir = () => path.join(process.cwd(), "data", "uploads", "tickets");
export const ensureTicketFilesDir = () => mkdir(ticketFilesDir(), { recursive: true });

export const TICKET_FILE_NAME = /^[a-f0-9]{24}\.(pdf|jpg|png|zip)$/;
export const newTicketFileName = (ext: "pdf" | "jpg" | "png" | "zip") => `${randomBytes(12).toString("hex")}.${ext}`;

export async function removeTicketFile(name: string) {
  if (TICKET_FILE_NAME.test(name)) await unlink(path.join(ticketFilesDir(), name)).catch(() => {});
}
