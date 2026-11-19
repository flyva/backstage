import "server-only";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const SETTING_KEYS = [
  "wifi_ssid",
  "wifi_password",
  "wifi_security", // WPA | WEP | nopass | EAP
  "wifi_qr_payload", // texte du QR Wi-Fi de l'école, lu depuis une photo (sert à refaire un QR propre)
  "school_map_file",
  "school_address",
  "school_lat", // renseignés automatiquement à partir de l'adresse
  "school_lng",
  "webmail_url",
  "ypareo_url",
  "studea_url",
  "school_instagram_url",
  "school_website_url", // site de l'école, proposé sur la carte de visite (https://www.3is.fr par défaut)
  "instagram_feed_url", // flux JSON public (ex. Behold), voir /instagram
  "cgu_body", // conditions générales d'utilisation (markdown), voir /cgu
  "mentions_legales_body", // mentions légales (markdown), voir /mentions-legales
  "politique_confidentialite_body", // politique de confidentialité (markdown), voir /politique-de-confidentialite
  // Fiche officielle de l'association (RNA, SIREN/SIRET, adresses…), voir /admin/association. Les champs marqués
  // d'une étoile dans la demande d'origine apparaissent sur le document imprimable (recto officiel, sans mention Backstage).
  "asso_rna",
  "asso_titre",
  "asso_adresse_siege",
  "asso_adresse_gestion",
  "asso_siren",
  "asso_siret",
  "asso_doc_recu_rna", // nom de fichier dans data/uploads
  "asso_doc_lettre_intention", // nom de fichier dans data/uploads
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export async function getSettings(): Promise<Partial<Record<SettingKey, string>>> {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
