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
  "instagram_feed_url", // flux JSON public (ex. Behold), voir /instagram
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export async function getSettings(): Promise<Partial<Record<SettingKey, string>>> {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
