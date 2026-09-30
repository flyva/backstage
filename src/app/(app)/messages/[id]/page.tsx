import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, listings, messages, reviews, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_LABEL, LISTING_PHOTO_PREFIX } from "@/lib/listing-shared";
import { messageCountsBySender, ratingSummary } from "@/lib/messaging";
import { toLive } from "@/lib/message-bus";
import { Avatar } from "@/components/people-forms";
import { AutoRefresh } from "@/components/AutoRefresh";
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

  // Lu à l'ouverture : la date de lecture dépasse celle du dernier message.
  await db.update(conversations).set(iAmBuyer ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() }).where(eq(conversations.id, id));

  // Les avis ne suivent qu'une vente réelle : l'annonce doit avoir été conclue avec l'acheteur de cette conversation.
  const concluded = listing?.status === "closed";
  const dealWithBuyer = concluded && listing.soldToId === conv.buyerId;
  const withdrawn = concluded && listing.soldToId === null;
  const bothWrote = (counts.get(conv.buyerId) ?? 0) >= 1 && (counts.get(conv.sellerId) ?? 0) >= 1;
  const rating = ratings.get(otherId);

  return (
    <div className="max-w-3xl space-y-5">
      <AutoRefresh seconds={20} /> {/* met à jour l'aperçu de l'annonce et le panneau d'avis (les messages, eux, arrivent en direct) */}
      <header className="space-y-3">
        <p className="text-sm"><Link href="/messages" className="text-muted underline">← Messages</Link></p>
        <div className="flex items-center gap-3">
          <Avatar name={other?.name ?? "?"} url={avatarUrl(other?.avatar)} size={48} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{other?.visible ? <Link href={`/annuaire/${other.id}`} className="hover:text-accent">{other.name}</Link> : (other?.name ?? "Personne supprimée")}</h1>
            {rating && <RatingBadge avg={rating.avg} n={rating.n} />}
          </div>
        </div>

        {/* Aperçu de l'annonce concernée */}
        {listing ? (
          <Link href={`/annonces/${listing.id}`} className="card flex items-center gap-3 p-3 hover:border-accent">
            {listing.photoFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${LISTING_PHOTO_PREFIX}${listing.photoFile}`} alt="" className="size-16 shrink-0 rounded-lg border border-line object-cover" />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-line text-xs text-muted">Annonce</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{listing.title}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{LISTING_LABEL[listing.category]}</span>
                {listing.price && <span className="rounded-full bg-accent px-2 py-0.5 font-bold text-accent-fg">{listing.price}</span>}
                {concluded && <span className="rounded-full border border-line px-2 py-0.5 font-semibold">{listing.soldToId ? (dealWithBuyer ? "Conclue avec l'acheteur" : "Conclue avec quelqu'un d'autre") : "Retirée"}</span>}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted">Voir l&apos;annonce →</span>
          </Link>
        ) : (
          <p className="text-sm text-muted">L&apos;annonce a été supprimée.</p>
        )}
      </header>

      <section className="card space-y-3" aria-label="Messages">
        <LiveThread conversationId={id} meId={user.id} initial={thread.map(toLive)} />
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
              {iAmBuyer ? "Quand le vendeur indiquera qu'il t'a vendu l'article, tu pourras laisser ton avis ici." : <>Quand tu auras vendu, <Link href={`/annonces/${conv.listingId}`} className="text-fg underline">conclus l&apos;annonce</Link> en choisissant l&apos;acheteur : vous pourrez alors vous noter.</>}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
