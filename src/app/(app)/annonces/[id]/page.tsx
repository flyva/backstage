import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, listingPhotos, listings, reviews, tracks, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_LABEL, formatPrice } from "@/lib/listing-shared";
import { deleteReview } from "@/lib/message-actions";
import { concludeListing, setListingStatus } from "@/lib/listing-actions";
import { ratingSummary } from "@/lib/messaging";
import { ago } from "@/lib/relative-time";
import { Avatar } from "@/components/people-forms";
import { StartConversationForm } from "@/components/message-forms";
import { PhotoGallery, PhotoManager } from "@/components/listing-photos";
import { RatingBadge, Stars } from "@/components/Stars";

export async function generateMetadata({ params }: PageProps<"/annonces/[id]">) {
  const [l] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, Number((await params).id))).limit(1);
  return { title: l ? l.title : "Annonce" };
}

export default async function ListingPage({ params }: PageProps<"/annonces/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [row] = await db
    .select({ l: listings, name: users.name, avatar: users.avatarFile, trackId: users.trackId, visible: users.showInDirectory })
    .from(listings).innerJoin(users, eq(users.id, listings.userId)).where(eq(listings.id, id)).limit(1);
  if (!row) notFound();
  const { l } = row;
  const isOwner = l.userId === user.id;
  const live = l.status === "active" && l.expiresAt > new Date();

  const [trackRow, ratings, sellerReviews, mine, mineAsSeller, secondary] = await Promise.all([
    row.trackId ? db.select({ name: tracks.name }).from(tracks).where(eq(tracks.id, row.trackId)).limit(1) : Promise.resolve([]),
    ratingSummary([l.userId]),
    db
      .select({ r: reviews, author: users.name })
      .from(reviews).innerJoin(users, eq(users.id, reviews.authorId))
      .where(eq(reviews.subjectId, l.userId)).orderBy(desc(reviews.createdAt)).limit(20),
    // Ma conversation avec l'auteur à propos de cette annonce (si j'en ai déjà une)
    !isOwner ? db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.listingId, id), eq(conversations.buyerId, user.id))).limit(1) : Promise.resolve([]),
    // Conversations ouvertes sur mon annonce
    isOwner
      ? db
          .select({ id: conversations.id, buyerId: conversations.buyerId, buyer: users.name, at: conversations.lastMessageAt })
          .from(conversations).innerJoin(users, eq(users.id, conversations.buyerId))
          .where(eq(conversations.listingId, id)).orderBy(desc(conversations.lastMessageAt))
      : Promise.resolve([]),
    db.select({ file: listingPhotos.file }).from(listingPhotos).where(eq(listingPhotos.listingId, id)).orderBy(asc(listingPhotos.position), asc(listingPhotos.id)),
  ]);
  const rating = ratings.get(l.userId);
  // Photo principale en premier, puis les secondaires
  const photos = [l.photoFile, ...secondary.map((p) => p.file)].filter((f): f is string => !!f);
  const canEdit = isOwner || user.perms.administration;

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm"><Link href="/annonces" className="text-muted underline">← Annonces</Link></p>

      <article className="card space-y-4 p-5">
        <PhotoGallery files={photos} title={l.title} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">{LISTING_LABEL[l.category]}</span>
          {formatPrice(l.price) && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">{formatPrice(l.price)}</span>}
          {!live && <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">{l.status === "closed" ? (l.soldToId ? "Conclue" : "Retirée") : "Expirée"}</span>}
        </div>
        <h1 className="text-2xl font-bold leading-snug">{l.title}</h1>
        <p className="whitespace-pre-line text-sm">{l.description}</p>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Avatar name={row.name} url={avatarUrl(row.avatar)} size={44} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{row.visible ? <Link href={`/annuaire/${l.userId}`} className="hover:text-accent">{row.name}</Link> : row.name}{trackRow[0] ? <span className="font-normal text-muted"> · {trackRow[0].name}</span> : null}</div>
            {rating ? <RatingBadge avg={rating.avg} n={rating.n} /> : <span className="text-xs text-muted">Pas encore d&apos;avis</span>}
          </div>
          <span className="ml-auto text-xs text-muted">{ago(l.createdAt)}</span>
        </div>
        <p className="text-sm"><span className="text-muted">Autre moyen de contact :</span> <strong className="break-words">{l.contact}</strong></p>
      </article>

      {canEdit && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Photos de l&apos;annonce</h2>
          <PhotoManager listingId={id} files={photos} />
        </section>
      )}

      {!isOwner && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Messagerie</h2>
          {mine[0] && <p className="text-sm">Tu as déjà écrit à {row.name} : <Link href={`/messages/${mine[0].id}`} className="font-medium underline">reprendre la conversation</Link>.</p>}
          {live ? <StartConversationForm listingId={id} sellerName={row.name} /> : <p className="text-sm text-muted">Cette annonce est terminée ou expirée.</p>}
        </section>
      )}
      {isOwner && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Conversations sur ton annonce ({mineAsSeller.length})</h2>
          {mineAsSeller.length === 0 && <p className="text-sm text-muted">Personne ne t&apos;a encore écrit.</p>}
          {l.status === "closed" ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg p-3 text-sm">
              <span className="min-w-0 flex-1">
                {l.soldToId ? <>Conclue avec <strong>{mineAsSeller.find((c) => c.buyerId === l.soldToId)?.buyer ?? "un acheteur"}</strong> : vous pouvez vous noter depuis la conversation.</> : "Annonce retirée sans vente."}
              </span>
              <form action={setListingStatus}><input type="hidden" name="id" value={l.id} /><button className="underline">Republier 60 jours</button></form>
            </div>
          ) : live ? (
            <div className="space-y-3 rounded-xl border border-line bg-bg p-3">
              <p className="text-sm font-medium">C&apos;est vendu, donné ou pourvu ?</p>
              <form action={concludeListing} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={l.id} />
                <select name="buyerId" className="input w-auto max-w-full" defaultValue="" aria-label="À qui ?" required>
                  <option value="" disabled>Choisis la personne…</option>
                  {mineAsSeller.map((c) => <option key={c.id} value={c.buyerId}>{c.buyer}</option>)}
                </select>
                <button className="btn" disabled={mineAsSeller.length === 0}>Conclure avec cette personne</button>
              </form>
              <p className="text-xs text-muted">Seule la personne choisie pourra échanger un avis avec toi. {mineAsSeller.length === 0 && "Il faut qu'au moins une personne t'ait écrit."}</p>
              <form action={concludeListing} className="text-xs">
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="buyerId" value="0" />
                <button className="underline">Retirer l&apos;annonce sans vente (vendu ailleurs, plus disponible)</button>
              </form>
            </div>
          ) : null}
          <ul className="divide-y divide-line text-sm">
            {mineAsSeller.map((c) => (
              <li key={c.id}><Link href={`/messages/${c.id}`} className="flex items-center gap-3 py-2 hover:text-accent"><span className="min-w-0 flex-1 truncate font-medium">{c.buyer}</span><span className="text-xs text-muted">{ago(c.at)}</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Avis sur {row.name}{rating ? ` (${rating.n})` : ""}</h2>
        {sellerReviews.length === 0 && <p className="text-sm text-muted">Aucun avis pour le moment. Les avis se laissent depuis la messagerie, après un échange.</p>}
        <ul className="divide-y divide-line">
          {sellerReviews.map(({ r, author }) => (
            <li key={r.id} className="space-y-1 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-medium">{author}</span>
                <span className="text-xs text-muted">{r.subjectRole === "seller" ? "à propos d'une vente" : "à propos d'un achat"} · « {r.listingTitle} » · {ago(r.createdAt)}</span>
              </div>
              {r.comment && <p className="whitespace-pre-line text-muted">{r.comment}</p>}
              {(r.authorId === user.id || user.perms.administration) && (
                <form action={deleteReview}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-muted underline">Supprimer cet avis</button></form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
