import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Envoi d'e-mails par SMTP (mot de passe oublié). Variables d'environnement :
//   MAIL_HOST, MAIL_PORT (587 par défaut), MAIL_USER, MAIL_PASS, MAIL_FROM (« Backstage <noreply@ton-domaine.fr> »),
//   MAIL_SECURE=true pour le port 465. Sans MAIL_HOST, aucun mail n'est envoyé (en développement, le lien est écrit dans la console).

export const mailEnabled = () => !!process.env.MAIL_HOST;

/** Adresse publique du site pour les liens des mails (APP_URL en production ; localhost en développement). */
export function publicBaseUrl(): string | null {
  const fixed = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  return process.env.NODE_ENV === "production" ? null : "http://localhost:3100";
}

let transport: Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.MAIL_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port,
      secure: process.env.MAIL_SECURE === "true" || port === 465,
      auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined,
    });
  }
  return transport;
}

/** Envoie un mail. Renvoie false si le mail n'est pas configuré ou si l'envoi a échoué (l'erreur est journalisée, jamais renvoyée à l'utilisateur). */
export async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!mailEnabled()) {
    if (process.env.NODE_ENV !== "production") console.log(`[mail non configuré] à ${to} : ${subject}\n${text}`);
    return false;
  }
  try {
    await getTransport().sendMail({ from: process.env.MAIL_FROM || process.env.MAIL_USER, to, subject, text, html });
    return true;
  } catch (e) {
    console.error("[mail] échec d'envoi :", e instanceof Error ? e.message : e);
    return false;
  }
}
