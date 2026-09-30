import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { mailEnabled, publicBaseUrl, sendMail } from "@/lib/mail";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Prévient par mail les administrateurs qu'un compte attend leur validation (sans effet si l'envoi de mails n'est pas configuré). */
export async function notifyPendingAccount(p: { name: string; email: string; note?: string | null }) {
  if (!mailEnabled()) return;
  try {
    const admins = await db.select({ email: users.email }).from(users).innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.status, "active"), or(eq(roles.isAdmin, true), eq(roles.permAdministration, true))));
    if (admins.length === 0) return;
    const base = publicBaseUrl();
    const link = base ? `${base}/admin` : "";
    const text = `Une personne demande l'accès à Backstage.\n\n${p.name} <${p.email}>${p.note ? `\n\nMessage : ${p.note}` : ""}\n${link ? `\nÀ valider ici : ${link}\n` : ""}`;
    const html = `<p>Une personne demande l'accès à Backstage.</p><p><strong>${esc(p.name)}</strong> &lt;${esc(p.email)}&gt;</p>${p.note ? `<p style="white-space:pre-line;border-left:3px solid #ccc;padding-left:10px">${esc(p.note)}</p>` : ""}${link ? `<p><a href="${link}">Ouvrir l'administration pour valider ou refuser</a></p>` : ""}`;
    await Promise.all(admins.map((a) => sendMail(a.email, "Backstage : un compte attend ta validation", text, html)));
  } catch (e) {
    console.error("[admin-notify]", e instanceof Error ? e.message : e);
  }
}
