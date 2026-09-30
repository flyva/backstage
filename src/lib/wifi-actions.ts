"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { parseWifiQr } from "@/lib/wifi";
import type { FormState } from "@/lib/actions";

const put = (key: string, value: string) => db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });

/** Enregistre le Wi-Fi de l'école d'après le texte lu dans son QR code (photo ou scan). */
export async function saveWifiFromQr(payload: string): Promise<FormState> {
  await requireAdmin();
  const w = parseWifiQr(String(payload ?? ""));
  if (!w) return { error: "Ce QR code n'est pas un QR de connexion Wi-Fi" };
  await put("wifi_ssid", w.ssid);
  await put("wifi_security", w.security);
  await put("wifi_password", w.password);
  await put("wifi_qr_payload", String(payload).trim());
  revalidatePath("/ecole");
  return { ok: `Wi-Fi « ${w.ssid} » enregistré` };
}
