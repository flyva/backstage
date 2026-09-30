// Gabarit commun des e-mails : tableaux et styles en ligne (les messageries ignorent les feuilles de style), fond clair forcé.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type MailContent = {
  /** Texte d'aperçu affiché par la messagerie à côté de l'objet. */
  preview: string;
  title: string;
  /** Paragraphes (texte brut, échappé). */
  paragraphs: string[];
  /** Bouton d'action facultatif. */
  button?: { label: string; url: string };
  /** Citation facultative (message d'une personne). */
  quote?: string;
  /** Petite mention en bas de la carte. */
  note?: string;
};

export function renderMail(c: MailContent): string {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const paragraphs = c.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#344054">${esc(p)}</p>`).join("");
  const quote = c.quote ? `<div style="margin:0 0 18px;padding:12px 14px;background:#f3f5f8;border-left:3px solid #f59e0b;border-radius:6px;font-size:14px;line-height:1.5;color:#344054;white-space:pre-line">${esc(c.quote)}</div>` : "";
  const button = c.button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0"><tr><td style="background:#111827;border-radius:10px"><a href="${esc(c.button.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${font}">${esc(c.button.label)}</a></td></tr></table>
       <p style="margin:0 0 6px;font-size:12px;color:#667085">Le bouton ne marche pas ? Copie cette adresse dans ton navigateur :</p>
       <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all"><a href="${esc(c.button.url)}" style="color:#667085">${esc(c.button.url)}</a></p>`
    : "";
  const note = c.note ? `<p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e3e7ee;font-size:13px;line-height:1.5;color:#667085">${esc(c.note)}</p>` : "";
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(c.title)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(c.preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f8"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px">
    <tr><td style="padding:0 4px 14px;font-family:${font};font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#111827">Back<span style="color:#f59e0b">stage</span></td></tr>
    <tr><td style="background:#ffffff;border:1px solid #e3e7ee;border-radius:16px;padding:30px 28px;font-family:${font}">
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:700;color:#111827">${esc(c.title)}</h1>
      ${paragraphs}${quote}${button}${note}
    </td></tr>
    <tr><td style="padding:16px 4px 0;font-family:${font};font-size:12px;line-height:1.5;color:#98a2b3">Le hub de la promo 3IS · projet d'élèves, non officiel.<br>Tu reçois ce message parce qu'une action a été demandée sur Backstage.</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
