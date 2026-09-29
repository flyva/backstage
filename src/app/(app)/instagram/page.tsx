import Link from "next/link";
import { ExternalLink, Play } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getInstaPosts } from "@/lib/instagram";

export const metadata = { title: "Instagram" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", year: "numeric" });

export default async function InstagramPage() {
  const user = await requireUser();
  const s = await getSettings();
  const feed = s.instagram_feed_url ? await getInstaPosts(s.instagram_feed_url) : null;
  const profile = s.school_instagram_url;

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Instagram de l&apos;école</h1>
          <p className="text-sm text-muted">Les dernières publications, sans quitter Backstage.</p>
        </div>
        {profile && (
          <a href={profile} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Ouvrir le profil <ExternalLink size={14} />
          </a>
        )}
      </header>

      {!feed && (
        <div className="card space-y-2 text-sm">
          <p>Le flux n&apos;est pas encore configuré.</p>
          {user.role === "admin" ? (
            <p className="text-muted">
              Crée un flux JSON gratuit avec un service comme Behold à partir du compte Instagram de l&apos;école, puis colle son lien dans{" "}
              <Link href="/admin" className="text-accent underline">Admin → Paramètres</Link> (« Flux Instagram »).
            </p>
          ) : (
            profile && <p className="text-muted">En attendant, tu peux ouvrir directement le profil de l&apos;école.</p>
          )}
        </div>
      )}

      {feed?.error && (
        <div className="card border-danger text-sm">Impossible de charger le flux : {feed.error}</div>
      )}

      {feed && !feed.error && feed.posts.length === 0 && <p className="text-sm text-muted">Aucune publication trouvée dans le flux.</p>}

      {feed && feed.posts.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {feed.posts.map((p) => (
            <li key={p.id}>
              <a
                href={p.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-lg border border-line bg-bg"
                title={p.caption}
              >
                {/* Image chargée depuis le CDN du service, sans envoyer notre adresse en referrer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.caption.slice(0, 120)} referrerPolicy="no-referrer" loading="lazy" className="size-full object-cover" />
                {p.isVideo && <span className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"><Play size={14} fill="currentColor" /></span>}
                <span className="absolute inset-x-0 bottom-0 line-clamp-3 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {p.date && <span className="block text-[10px] opacity-80">{dateFmt.format(p.date)}</span>}
                  {p.caption}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
