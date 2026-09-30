import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { Mail, Phone } from "lucide-react";
import { db } from "@/db";
import { listings, reviews, tracks, userLinks, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_LABEL, LISTING_PHOTO_PREFIX } from "@/lib/listing-shared";
import { ratingSummary } from "@/lib/messaging";
import { LINK_LABEL, school3isEmail } from "@/lib/people-shared";
import { ago } from "@/lib/relative-time";
import { Avatar, CopyChip } from "@/components/people-forms";
import { RatingBadge, Stars } from "@/components/Stars";

export async function generateMetadata({ params }: PageProps<"/annuaire/[id]">) {
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, Number((await params).id))).limit(1);
  return { title: u ? `Fiche de ${u.name}` : "Fiche" };
}

// Fiche d'une personne, dans Backstage : réservée aux membres connectés. Elle montre ce que la personne a choisi d'afficher dans l'annuaire.
export default async function MemberPage({ params }: PageProps<"/annuaire/[id]">) {
  const viewer = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [u] = await db.select().from(users).where(and(eq(users.id, id), eq(users.status, "active"))).limit(1);
  const isSelf = !!u && u.id === viewer.id;
  // Une personne qui a choisi de ne pas apparaître dans l'annuaire n'a pas de fiche visible (sauf pour elle-même).
  if (!u || (!u.showInDirectory && !isSelf)) notFound();

  const [trackRow, links, ratings, received, listed] = await Promise.all([
    u.trackId ? db.select({ name: tracks.name }).from(tracks).where(eq(tracks.id, u.trackId)).limit(1) : Promise.resolve([]),
    db.select().from(userLinks).where(eq(userLinks.userId, id)).orderBy(asc(userLinks.sortOrder)),
    ratingSummary([id]),
    db.select({ r: reviews, author: users.name }).from(reviews).innerJoin(users, eq(users.id, reviews.authorId)).where(eq(reviews.subjectId, id)).orderBy(desc(reviews.createdAt)).limit(10),
    db.select().from(listings).where(and(eq(listings.userId, id), eq(listings.status, "active"), gt(listings.expiresAt, new Date()))).orderBy(desc(listings.createdAt)).limit(6),
  ]);
  const email3is = school3isEmail(u.email);
  const rating = ratings.get(id);

  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/annuaire" className="text-muted underline">← Annuaire</Link></p>
      {isSelf && (
        <div className="card border-accent text-sm">
          {u.showInDirectory ? "Voici ta fiche telle que les autres membres la voient. " : "Tu as choisi de ne pas apparaître dans l'annuaire : personne d'autre ne peut ouvrir cette fiche. "}
          <Link href="/profil" className="font-medium text-accent underline">Modifier dans mon profil</Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <section className="card space-y-5 p-6 text-center lg:self-start">
          <div className="flex justify-center"><Avatar name={u.name} url={avatarUrl(u.avatarFile)} size={112} /></div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold">{u.name}</h1>
            {u.headline && <p className="text-muted">{u.headline}</p>}
            {trackRow[0] && <span className="inline-block rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">{trackRow[0].name}</span>}
            {rating && <div><RatingBadge avg={rating.avg} n={rating.n} /></div>}
          </div>
          <div className="space-y-2">
            {email3is && <a href={`mailto:${email3is}`} className="btn w-full"><Mail size={16} aria-hidden /> {email3is}</a>}
            {u.phone && u.showPhone && <a href={`tel:${u.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost w-full"><Phone size={16} aria-hidden /> {u.phone}</a>}
            {u.discord && <div className="flex justify-center"><CopyChip value={u.discord} prefix="Discord : " className="px-3 py-1.5 text-sm" /></div>}
          </div>
          {links.length > 0 && (
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id}><a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-ghost w-full">{l.label || LINK_LABEL[l.kind]}</a></li>
              ))}
            </ul>
          )}
          {u.cardEnabled && u.cardSlug && (
            <a href={`/carte/${u.cardSlug}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted underline">Sa carte de visite publique</a>
          )}
        </section>

        <div className="space-y-5">
          <section className="card space-y-3">
            <h2 className="font-semibold">Annonces de {u.firstName || u.name} ({listed.length})</h2>
            {listed.length === 0 && <p className="text-sm text-muted">Aucune annonce en cours.</p>}
            <ul className="grid gap-3 sm:grid-cols-2">
              {listed.map((l) => (
                <li key={l.id}>
                  <Link href={`/annonces/${l.id}`} className="flex gap-3 rounded-xl border border-line p-3 hover:border-accent">
                    {l.photoFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${LISTING_PHOTO_PREFIX}${l.photoFile}`} alt="" className="size-14 shrink-0 rounded-lg border border-line object-cover" loading="lazy" />
                    ) : (
                      <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-line text-[10px] text-muted">Annonce</span>
                    )}
                    <div className="min-w-0 text-sm">
                      <div className="truncate font-medium">{l.title}</div>
                      <div className="text-xs text-muted">{LISTING_LABEL[l.category]}{l.price ? ` · ${l.price}` : ""}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-3">
            <h2 className="font-semibold">Avis reçus{rating ? ` (${rating.n})` : ""}</h2>
            {received.length === 0 && <p className="text-sm text-muted">Aucun avis pour le moment. Les avis se laissent après une vente, depuis la messagerie.</p>}
            <ul className="divide-y divide-line">
              {received.map(({ r, author }) => (
                <li key={r.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-medium">{author}</span>
                    <span className="text-xs text-muted">« {r.listingTitle} » · {ago(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="whitespace-pre-line text-muted">{r.comment}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
