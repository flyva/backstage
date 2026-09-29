import "server-only";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const SETTING_KEYS = [
  "wifi_ssid",
  "wifi_password",
  "wifi_security", // WPA | WEP | nopass
  "school_map_file",
  "school_address",
  "webmail_url",
  "ypareo_url",
  "studea_url",
  "school_instagram_url",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export async function getSettings(): Promise<Partial<Record<SettingKey, string>>> {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
