import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { WifiActions } from "@/components/WifiActions";

export const metadata = { title: "École" };

// Échappement des caractères spéciaux du format QR « WIFI: ».
const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");

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

  let qr: string | null = null;
  if (s.wifi_ssid && (security === "nopass" || s.wifi_password)) {
    const payload =
      security === "nopass"
        ? `WIFI:T:nopass;S:${esc(s.wifi_ssid)};;`
        : `WIFI:T:${security};S:${esc(s.wifi_ssid)};P:${esc(s.wifi_password ?? "")};;`;
    qr = await QRCode.toString(payload, { type: "svg", margin: 1, width: 220 });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">L&apos;école</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Wi-Fi</h2>
        {s.wifi_ssid ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {qr && (
              <div
                className="w-[220px] shrink-0 overflow-hidden rounded-lg bg-white p-1 [&>svg]:h-auto [&>svg]:w-full"
                role="img"
                aria-label="QR code de connexion Wi-Fi"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            )}
            <div className="space-y-3">
              <p className="text-sm">
                Réseau : <strong>{s.wifi_ssid}</strong>
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
          <p className="text-sm text-muted">Le Wi-Fi n&apos;est pas encore configuré (Admin → Paramètres).</p>
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
