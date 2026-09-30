import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { renderMail } from "@/lib/mail-template";
import { mailEnabled, publicBaseUrl, sendMail } from "@/lib/mail";

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
    const html = renderMail({ preview: `${p.name} demande l'accès à Backstage.`, title: "Une demande d'accès attend ta validation", paragraphs: [`${p.name} (${p.email}) demande l'accès à Backstage.`], quote: p.note ?? undefined, button: link ? { label: "Valider ou refuser", url: link } : undefined });
    await Promise.all(admins.map((a) => sendMail(a.email, "Backstage : un compte attend ta validation", text, html)));
  } catch (e) {
    console.error("[admin-notify]", e instanceof Error ? e.message : e);
  }
}

/** Prévient par mail la personne dont la demande d'accès vient d'être validée ou refusée (sans effet si l'envoi de mails n'est pas configuré). */
export async function notifyDecision(p: { email: string; name: string; approved: boolean; reason?: string }) {
  if (!mailEnabled()) return;
  try {
    const base = publicBaseUrl();
    const firstName = p.name.split(/\s+/)[0] || p.name;
    const subject = p.approved ? "Backstage : ton accès est validé" : "Backstage : ta demande d'accès a été refusée";
    const text = p.approved
      ? `Bonjour ${firstName},\n\nTa demande d'accès à Backstage a été validée. Tu peux te connecter${base ? ` : ${base}` : ""}.\n`
      : `Bonjour ${firstName},\n\nTa demande d'accès à Backstage a été refusée.${p.reason ? `\n\nMotif : ${p.reason}` : ""}\n\nSi tu penses que c'est une erreur, contacte la personne qui gère Backstage.\n`;
    const html = renderMail(
      p.approved
        ? { preview: "Ton accès à Backstage est validé.", title: "Ton accès est validé", paragraphs: [`Bonjour ${firstName},`, "Ta demande d'accès à Backstage a été validée : tu peux te connecter."], button: base ? { label: "Ouvrir Backstage", url: base } : undefined }
        : { preview: "Ta demande d'accès a été refusée.", title: "Ta demande a été refusée", paragraphs: [`Bonjour ${firstName},`, "Ta demande d'accès à Backstage a été refusée."], quote: p.reason || undefined, note: "Si tu penses que c'est une erreur, contacte la personne qui gère Backstage." },
    );
    await sendMail(p.email, subject, text, html);
  } catch (e) {
    console.error("[notifyDecision]", e instanceof Error ? e.message : e);
  }
}
