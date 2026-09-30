// Format des QR codes Wi-Fi (« WIFI:T:WPA;S:nom;P:mot de passe;; »), partagé serveur / client.

export type WifiInfo = {
  ssid: string;
  security: "WPA" | "WEP" | "nopass" | "EAP";
  password: string;
  hidden: boolean;
  eap: string | null; // méthode EAP (PEAP, TTLS…) pour un réseau d'entreprise
  identity: string | null;
};

/** Lit un texte « WIFI:… » (avec ses échappements \; \, \: \\ \"). Renvoie null si ce n'est pas un QR Wi-Fi. */
export function parseWifiQr(raw: string): WifiInfo | null {
  const text = raw.trim();
  if (!/^WIFI:/i.test(text) || text.length > 600) return null;
  const fields = new Map<string, string>();
  let key = "";
  let val = "";
  let inKey = true;
  const body = text.slice(5);
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\" && i + 1 < body.length) {
      i++;
      if (inKey) key += body[i];
      else val += body[i];
    } else if (inKey && c === ":") {
      inKey = false;
    } else if (!inKey && c === ";") {
      fields.set(key.toUpperCase(), val);
      key = "";
      val = "";
      inKey = true;
    } else if (inKey && c === ";") {
      key = "";
    } else if (inKey) key += c;
    else val += c;
  }
  const ssid = fields.get("S");
  if (!ssid) return null;
  const t = (fields.get("T") ?? "WPA").toUpperCase();
  const eap = fields.get("E") || null;
  const security: WifiInfo["security"] = eap || /EAP/.test(t) ? "EAP" : t === "NOPASS" || t === "" ? "nopass" : t === "WEP" ? "WEP" : "WPA";
  return { ssid, security, password: fields.get("P") ?? "", hidden: (fields.get("H") ?? "").toLowerCase() === "true", eap, identity: fields.get("I") || null };
}

const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");

/** Texte à mettre dans un QR code pour rejoindre ce réseau (sans EAP : ces réseaux passent par leur QR d'origine). */
export function buildWifiQr(w: { ssid: string; security: string; password: string }): string {
  return w.security === "nopass" ? `WIFI:T:nopass;S:${esc(w.ssid)};;` : `WIFI:T:${w.security === "WEP" ? "WEP" : "WPA"};S:${esc(w.ssid)};P:${esc(w.password)};;`;
}

export const SECURITY_LABEL: Record<string, string> = { WPA: "WPA / WPA2", WEP: "WEP", nopass: "Sans mot de passe", EAP: "Entreprise (identifiant + mot de passe)" };
