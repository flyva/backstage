import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, Handshake, Store } from "lucide-react";
import { db } from "@/db";
import { conversations, listings, messages, reviews, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_LABEL, LISTING_PHOTO_PREFIX, formatPrice } from "@/lib/listing-shared";
import { concludeListing, setListingStatus } from "@/lib/listing-actions";
import { messageCountsBySender, ratingSummary } from "@/lib/messaging";
import { emitEvent, toLive } from "@/lib/message-bus";
import { Avatar } from "@/components/people-forms";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LiveThread } from "@/components/LiveThread";
import { MessageComposer, ReviewForm } from "@/components/message-forms";
import { RatingBadge, Stars } from "@/components/Stars";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  // Une conversation n'est visible que par ses deux participants (pas même par un administrateur).
  if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) notFound();

  const iAmBuyer = conv.buyerId === user.id;
  const otherId = iAmBuyer ? conv.sellerId : conv.buyerId;
  const [thread, [other], [listing], counts, ratings, [myReview]] = await Promise.all([
    db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.id)),
    db.select({ id: users.id, name: users.name, avatar: users.avatarFile, visible: users.showInDirectory }).from(users).where(eq(users.id, otherId)).limit(1),
    db.select().from(listings).where(eq(listings.id, conv.listingId)).limit(1),
    messageCountsBySender(id),
    ratingSummary([otherId]),
    db.select().from(reviews).where(and(eq(reviews.authorId, user.id), eq(reviews.listingId, conv.listingId), eq(reviews.subjectId, otherId))).limit(1),
  ]);

  // Lu à l'ouverture : la date de lecture dépasse celle du dernier message, et l'autre personne voit « Vu ».
  const now = new Date();
  const otherReadAt = iAmBuyer ? conv.sellerReadAt : conv.buyerReadAt;
  await db.update(conversations).set(iAmBuyer ? { buyerReadAt: now } : { sellerReadAt: now }).where(eq(conversations.id, id));
  emitEvent(id, { kind: "read", userId: user.id, at: now.toISOString() });

  // Les avis ne suivent qu'une vente réelle : l'annonce doit avoir été conclue avec l'acheteur de cette conversation.
  const concluded = listing?.status === "closed";
  const dealWithBuyer = concluded && listing.soldToId === conv.buyerId;
  const withdrawn = concluded && listing.soldToId === null;
  const bothWrote = (counts.get(conv.buyerId) ?? 0) >= 1 && (counts.get(conv.sellerId) ?? 0) >= 1;
  const rating = ratings.get(otherId);
  const price = formatPrice(listing?.price);

  return (
    <div className="max-w-5xl space-y-5">
      <AutoRefresh seconds={20} /> {/* met à jour le panneau de l'offre et celui des avis (les messages, eux, arrivent en direct) */}
      <header className="space-y-2">
        <p className="text-sm"><Link href="/messages" className="text-muted underline">← Messages</Link></p>
        <div className="flex items-center gap-3">
          <Avatar name={other?.name ?? "?"} url={avatarUrl(other?.avatar)} size={48} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{other?.visible ? <Link href={`/annuaire/${other.id}`} className="hover:text-accent">{other.name}</Link> : (other?.name ?? "Personne supprimée")}</h1>
            {rating && <RatingBadge avg={rating.avg} n={rating.n} />}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        {/* Discussion + avis */}
        <div className="min-w-0 space-y-5">
          <section className="card space-y-3" aria-label="Messages">
            <LiveThread
              conversationId={id} meId={user.id} otherName={other?.name ?? "L'autre personne"}
              otherReadAt={otherReadAt ? otherReadAt.toISOString() : null} initial={thread.map(toLive)}
            />
            <div className="border-t border-line pt-3"><MessageComposer conversationId={id} /></div>
          </section>

          {other && (
            <section className="card space-y-3">
              <h2 className="font-semibold">Ton avis sur {other.name}</h2>
              {dealWithBuyer && bothWrote ? (
                <>
                  <p className="text-sm text-muted">Une note et un commentaire sur la personne et l&apos;échange : ils sont visibles par toute la promo.</p>
                  {myReview && <p className="flex items-center gap-2 text-sm"><Stars value={myReview.rating} /> <span className="text-muted">Ton avis actuel, modifiable ci-dessous.</span></p>}
                  <ReviewForm conversationId={id} subjectName={other.name} initialRating={myReview?.rating ?? 0} initialComment={myReview?.comment ?? ""} />
                </>
              ) : withdrawn ? (
                <p className="text-sm text-muted">L&apos;annonce a été retirée sans vente : il n&apos;y a pas d&apos;avis à laisser.</p>
              ) : concluded && !dealWithBuyer ? (
                <p className="text-sm text-muted">L&apos;annonce a été conclue avec une autre personne : il n&apos;y a pas d&apos;avis à laisser ici.</p>
              ) : (
                <p className="text-sm text-muted">
                  Les avis sont possibles après la vente.{" "}
                  {iAmBuyer ? "Quand le vendeur aura validé la vente, tu pourras laisser ton avis ici." : "Quand tu valides la vente dans le panneau de l'offre, vous pourrez vous noter."}
                </p>
              )}
            </section>
          )}
        </div>

        {/* Panneau de l'offre, à droite : l'annonce et les actions de vente */}
        <aside className="card space-y-4 lg:sticky lg:top-20" aria-label="L'offre">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted"><Store size={15} aria-hidden /> L&apos;offre</h2>
          {listing ? (
            <>
              <Link href={`/annonces/${listing.id}`} className="block space-y-3 rounded-xl hover:opacity-90">
                {listing.photoFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${LISTING_PHOTO_PREFIX}${listing.photoFile}`} alt="" className="h-40 w-full rounded-xl border border-line object-cover" />
                ) : (
                  <span className="grid h-24 w-full place-items-center rounded-xl border border-line text-xs text-muted">Pas de photo</span>
                )}
                <div>
                  <div className="font-semibold leading-snug">{listing.title}</div>
                  <div className="mt-0.5 text-xs text-muted">{LISTING_LABEL[listing.category]}</div>
                </div>
              </Link>
              {price && <div className="text-3xl font-bold tabular-nums">{price}</div>}

              {concluded ? (
                <div className="space-y-2 rounded-xl border border-line bg-bg p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium"><CheckCircle2 size={16} className="text-green-600 dark:text-green-400" aria-hidden />
                    {withdrawn ? "Annonce retirée" : dealWithBuyer ? "Vente validée" : "Vendue à quelqu'un d'autre"}
                  </p>
                  <p className="text-xs text-muted">
                    {withdrawn ? "Vendue ailleurs ou plus disponible." : dealWithBuyer ? (iAmBuyer ? "Le vendeur a validé la vente avec toi." : `Conclue avec ${other?.name ?? "l'acheteur"}. Vous pouvez vous noter.`) : "Cette annonce n'est plus disponible."}
                  </p>
                  {!iAmBuyer && (
                    <form action={setListingStatus}><input type="hidden" name="id" value={listing.id} /><button className="text-xs underline">Republier l&apos;annonce (60 jours)</button></form>
                  )}
                </div>
              ) : iAmBuyer ? (
                <p className="rounded-xl border border-line bg-bg p-3 text-sm text-muted">Le vendeur validera la vente ici quand vous serez d&apos;accord. Tu seras prévenu(e) par notification.</p>
              ) : (
                <div className="space-y-2">
                  <form action={concludeListing}>
                    <input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="buyerId" value={conv.buyerId} />
                    <ConfirmButton className="btn w-full" message={`Valider la vente à ${other?.name ?? "cette personne"} ? Elle sera prévenue et pourra laisser un avis.`}>
                      <Handshake size={16} aria-hidden /> Valider la vente
                    </ConfirmButton>
                  </form>
                  <form action={concludeListing}>
                    <input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="buyerId" value="0" />
                    <ConfirmButton className="btn-ghost w-full" message="Retirer l'annonce sans vente (vendu ailleurs, plus disponible) ?">Vendu ailleurs</ConfirmButton>
                  </form>
                  <p className="text-xs text-muted">« Valider la vente » conclut avec {other?.name ?? "cette personne"} et ouvre les avis. « Vendu ailleurs » retire l&apos;annonce, sans avis.</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">L&apos;annonce a été supprimée.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
