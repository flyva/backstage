import Link from "next/link";
import { and, desc, eq, gt, like, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { LISTING_CATEGORIES, listings, tracks, users, type ListingCategory } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_LABEL, LISTING_PHOTO_PREFIX } from "@/lib/listing-shared";
import { deleteListing, setListingStatus } from "@/lib/listing-actions";
import { school3isEmail } from "@/lib/people-shared";
import { ListingForm } from "@/components/listing-forms";
import { Avatar } from "@/components/people-forms";
import { ago } from "@/lib/relative-time";

export const metadata = { title: "Annonces" };

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim().slice(0, 80) : "");
const chip = (active: boolean) => `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-fg" : "border-line hover:bg-bg"}`;

export default async function AnnoncesPage({ searchParams }: PageProps<"/annonces">) {
  const user = await requireUser();
  const sp = await searchParams;
  const cat = (LISTING_CATEGORIES as readonly string[]).includes(param(sp.c)) ? (param(sp.c) as ListingCategory) : null;
  const q = param(sp.q);
  const now = new Date();

  const conds = [eq(listings.status, "active"), gt(listings.expiresAt, now)];
  if (cat) conds.push(eq(listings.category, cat));
  if (q) {
    const like_ = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conds.push(or(like(listings.title, like_), like(listings.description, like_))!);
  }
  const [feed, mine, trackRows] = await Promise.all([
    db.select({ l: listings, name: users.name, avatar: users.avatarFile, trackId: users.trackId }).from(listings).innerJoin(users, eq(users.id, listings.userId)).where(and(...conds)).orderBy(desc(listings.createdAt)).limit(200),
    // Mes annonces terminées : fermées ou expirées (on peut les republier).
    db.select().from(listings).where(and(eq(listings.userId, user.id), or(eq(listings.status, "closed"), lte(listings.expiresAt, now))!)).orderBy(desc(listings.createdAt)),
    db.select().from(tracks),
  ]);
  const trackName = new Map(trackRows.map((t) => [t.id, t.name]));
  const defaultContact = user.contactEmail || school3isEmail(user.email) || "";
  const isAdmin = user.perms.administration;
  const href = (c: string | null) => `/annonces${c || q ? `?${new URLSearchParams({ ...(c ? { c } : {}), ...(q ? { q } : {}) })}` : ""}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Annonces</h1>
        <p className="text-sm text-muted">Vente de matériel, colocs, missions et extras entre élèves. Les annonces sont publiées tout de suite et durent 60 jours.</p>
      </header>

      <details className="card group" open={feed.length === 0 && !q && !cat}>
        <summary className="cursor-pointer list-none font-semibold">Publier une annonce</summary>
        <div className="mt-4"><ListingForm defaultContact={defaultContact} /></div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={href(null)} className={chip(!cat)}>Toutes</Link>
        {LISTING_CATEGORIES.map((c) => <Link key={c} href={href(c)} className={chip(cat === c)}>{LISTING_LABEL[c]}</Link>)}
        <form action="/annonces" className="ml-auto flex gap-2">
          {cat && <input type="hidden" name="c" value={cat} />}
          <input name="q" defaultValue={q} placeholder="Rechercher…" className="input w-44" aria-label="Rechercher une annonce" />
          <button className="btn-ghost">Chercher</button>
        </form>
      </div>

      {feed.length === 0 && <p className="text-sm text-muted">Aucune annonce pour le moment.</p>}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {feed.map(({ l, name, avatar, trackId }) => {
          const can = l.userId === user.id || isAdmin;
          return (
            <li key={l.id} className="card flex flex-col gap-3 p-4">
              {l.photoFile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${LISTING_PHOTO_PREFIX}${l.photoFile}`} alt="" className="h-44 w-full rounded-xl border border-line object-cover" loading="lazy" />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">{LISTING_LABEL[l.category]}</span>
                {l.price && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">{l.price}</span>}
              </div>
              <h2 className="text-lg font-semibold leading-snug">{l.title}</h2>
              <p className="whitespace-pre-line text-sm text-muted">{l.description}</p>
              <div className="mt-auto space-y-2 border-t border-line pt-3 text-sm">
                <div className="flex items-center gap-2">
                  <Avatar name={name} url={avatarUrl(avatar)} size={28} />
                  <span className="min-w-0 flex-1 truncate font-medium">{name}{trackId && trackName.get(trackId) ? <span className="font-normal text-muted"> · {trackName.get(trackId)}</span> : null}</span>
                  <span className="shrink-0 text-xs text-muted">{ago(l.createdAt)}</span>
                </div>
                <p><span className="text-muted">Contact :</span> <strong className="break-words">{l.contact}</strong></p>
                {can && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    <form action={setListingStatus}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="status" value="closed" /><button className="underline">Marquer comme terminée</button></form>
                    <form action={deleteListing}><input type="hidden" name="id" value={l.id} /><button className="text-danger underline">Supprimer</button></form>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {mine.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Mes annonces terminées ou expirées</h2>
          <ul className="divide-y divide-line text-sm">
            {mine.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate">{l.title} <span className="text-muted">· {l.status === "closed" ? "terminée" : "expirée"}</span></span>
                <form action={setListingStatus}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="status" value="active" /><button className="underline">Republier 60 jours</button></form>
                <form action={deleteListing}><input type="hidden" name="id" value={l.id} /><button className="text-danger underline">Supprimer</button></form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
