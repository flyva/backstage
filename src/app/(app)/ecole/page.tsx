import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { WifiActions } from "@/components/WifiActions";
import { WifiQrImport } from "@/components/WifiQrImport";
import { SECURITY_LABEL, buildWifiQr } from "@/lib/wifi";

export const metadata = { title: "École" };

// « prenom.nom » : partie locale de l'adresse 3IS, sinon construit depuis le prénom et le nom (sans accents ni espaces).
const slug = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function wifiLogin(u: { email: string; firstName: string; lastName: string }) {
  const [local, domain] = u.email.toLowerCase().split("@");
  if (domain === "3is.fr") return { login: local, school: true };
  return { login: `${slug(u.firstName)}.${slug(u.lastName)}`, school: false };
}

export default async function EcolePage() {
  const user = await requireUser();
  const s = await getSettings();
  const security = s.wifi_security ?? "WPA";

  const { login, school } = wifiLogin(user);

  // QR refait proprement : à partir du QR de l'école photographié (fidèle à l'original, y compris pour un réseau d'entreprise),
  // sinon à partir du nom du réseau et du mot de passe saisis.
  const payload = s.wifi_qr_payload || (s.wifi_ssid && security !== "EAP" && (security === "nopass" || s.wifi_password) ? buildWifiQr({ ssid: s.wifi_ssid, security, password: s.wifi_password ?? "" }) : null);
  const qr = payload ? await QRCode.toString(payload, { type: "svg", margin: 2, width: 260, errorCorrectionLevel: "M" }) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">L&apos;école</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Wi-Fi</h2>
        {s.wifi_ssid ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {qr && (
              <div
                className="w-[260px] shrink-0 overflow-hidden rounded-lg bg-white p-1 [&>svg]:h-auto [&>svg]:w-full"
                role="img"
                aria-label="QR code de connexion Wi-Fi"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            )}
            <div className="space-y-3">
              <p className="text-sm">
                Réseau : <strong>{s.wifi_ssid}</strong>{security in SECURITY_LABEL && <span className="text-muted"> · {SECURITY_LABEL[security]}</span>}
              </p>
              <div className="rounded-xl border border-line p-3 text-sm">
                <p>
                  Identifiant : <strong className="select-all">{login}</strong>
                </p>
                <p className="mt-1 text-muted">
                  {school
                    ? "Mot de passe : celui de ton compte 3IS (le même que le webmail)."
                    : "Mot de passe : celui de ton webmail 3IS. Ton identifiant est prenom.nom, comme sur une adresse 3IS."}
                </p>
              </div>
              {qr && (
                <p className="text-sm text-muted">
                  Scanne le QR code avec l&apos;appareil photo de ton téléphone pour te connecter directement.
                </p>
              )}
              <WifiActions password={security === "nopass" ? "" : (s.wifi_password ?? "")} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Le Wi-Fi n&apos;est pas encore configuré{user.perms.administration ? " : photographie le QR code de l'école ci-dessous." : "."}</p>
        )}
        {user.perms.administration && (
          <details className="border-t border-line pt-3">
            <summary className="cursor-pointer text-sm font-medium">{s.wifi_ssid ? "Mettre à jour depuis le QR code de l'école" : "Ajouter le QR code de l'école"}</summary>
            <div className="pt-3"><WifiQrImport /></div>
          </details>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Plan de l&apos;école</h2>
        {s.school_address && <p className="text-sm text-muted">{s.school_address}</p>}
        {s.school_map_file ? (
          <a href={`/files/${s.school_map_file}`} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/files/${s.school_map_file}`} alt="Plan de l'école" className="w-full rounded-lg border border-line" />
          </a>
        ) : (
          <p className="text-sm text-muted">Aucun plan pour le moment (Admin → Paramètres).</p>
        )}
      </section>
    </div>
  );
}
