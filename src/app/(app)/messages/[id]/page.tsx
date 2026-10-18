import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { CheckCircle2, Handshake, Store, Trash2, Users } from "lucide-react";
import { db } from "@/db";
import { conversationMembers, conversations, listings, messages, reviews, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_LABEL, LISTING_PHOTO_PREFIX, formatPrice } from "@/lib/listing-shared";
import { concludeListing, setListingStatus } from "@/lib/listing-actions";
import { deleteConversation } from "@/lib/message-actions";
import { hydrateMessages, isMuted, isParticipant, messageCountsBySender, personalNoteAbout, ratingSummary, sharedImages } from "@/lib/messaging";
import { lastSeenLabel } from "@/lib/relative-time";
import { emitEvent } from "@/lib/message-bus";
import { Avatar } from "@/components/people-forms";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ConversationPanel } from "@/components/ConversationPanel";
import { ConversationShell } from "@/components/ConversationShell";
import { LeaveGroupButton, ReviewForm } from "@/components/message-forms";
import { RatingBadge, Stars } from "@/components/Stars";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv || !(await isParticipant(conv, user.id))) notFound();

  if (conv.kind === "group") return <GroupConversation conv={conv} userId={user.id} />;

  const iAmBuyer = conv.buyerId === user.id;
  const otherId = iAmBuyer ? conv.sellerId : conv.buyerId;
  const [thread, [other], [listing], counts, ratings, [myReview], media, muted, note] = await Promise.all([
    db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.id)),
    db.select({ id: users.id, name: users.name, avatar: users.avatarFile, visible: users.showInDirectory, lastSeenAt: users.lastSeenAt }).from(users).where(eq(users.id, otherId)).limit(1),
    conv.listingId ? db.select().from(listings).where(eq(listings.id, conv.listingId)).limit(1) : Promise.resolve([]),
    messageCountsBySender(id),
    ratingSummary([otherId]),
    conv.listingId ? db.select().from(reviews).where(and(eq(reviews.authorId, user.id), eq(reviews.listingId, conv.listingId), eq(reviews.subjectId, otherId))).limit(1) : Promise.resolve([]),
    sharedImages(id),
    isMuted(id, user.id),
    personalNoteAbout(user.id, otherId),
  ]);

  // Lu à l'ouverture : la date de lecture dépasse celle du dernier message, et l'autre personne voit « Vu ».
  const now = new Date();
  const otherReadAt = iAmBuyer ? conv.sellerReadAt : conv.buyerReadAt;
  await db.update(conversations).set(iAmBuyer ? { buyerReadAt: now } : { sellerReadAt: now }).where(eq(conversations.id, id));
  emitEvent(id, { kind: "read", userId: user.id, at: now.toISOString() });

  const liveThread = await hydrateMessages(id, thread);

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
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{other?.visible ? <Link href={`/annuaire/${other.id}`} className="hover:text-accent">{other.name}</Link> : (other?.name ?? "Personne supprimée")}</h1>
            {other?.lastSeenAt && <p className="text-xs text-muted">Vu {lastSeenLabel(other.lastSeenAt)}</p>}
            {rating && <RatingBadge avg={rating.avg} n={rating.n} />}
          </div>
          <form action={deleteConversation}>
            <input type="hidden" name="conversationId" value={id} />
            <ConfirmButton message="Supprimer définitivement cette conversation ? Les messages et pièces jointes disparaissent pour les deux personnes." className="btn-ghost shrink-0 text-xs text-muted hover:text-danger">
              <Trash2 size={14} /> Supprimer
            </ConfirmButton>
          </form>
        </div>
      </header>

      {!conv.listingId && (
        <ConversationShell
          conversationId={id} meId={user.id} otherId={otherId} otherName={other?.name ?? "L'autre personne"}
          otherAvatar={avatarUrl(other?.avatar) ?? null} otherVisible={!!other?.visible}
          otherReadAt={otherReadAt ? otherReadAt.toISOString() : null} lastSeen={other?.lastSeenAt ? lastSeenLabel(other.lastSeenAt) : null}
          muted={muted} initialNote={note} media={media} initial={liveThread}
        />
      )}

      {conv.listingId && (
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        {/* Discussion + avis */}
        <div className="min-w-0 space-y-5">
          <section className="card space-y-3" aria-label="Messages">
            <ConversationPanel
              conversationId={id} meId={user.id} otherName={other?.name ?? "L'autre personne"}
              otherReadAt={otherReadAt ? otherReadAt.toISOString() : null} initial={liveThread}
            />
          </section>

          {other && conv.listingId && (
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

        {/* Panneau de l'offre, à droite : l'annonce et les actions de vente (seulement pour une conversation d'annonce) */}
        {conv.listingId && (
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
        )}
      </div>
      )}
    </div>
  );
}

type GroupConv = { id: number; name: string | null; buyerId: number };

async function GroupConversation({ conv, userId }: { conv: GroupConv; userId: number }) {
  const [thread, members] = await Promise.all([
    db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(asc(messages.id)),
    db.select({ id: users.id, name: users.name, avatar: users.avatarFile }).from(users)
      .innerJoin(conversationMembers, eq(conversationMembers.userId, users.id))
      .where(and(eq(conversationMembers.conversationId, conv.id), isNull(conversationMembers.leftAt))),
  ]);
  const [liveThread, media, muted] = await Promise.all([
    hydrateMessages(conv.id, thread),
    sharedImages(conv.id),
    isMuted(conv.id, userId),
  ]);
  const participantNames = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const now = new Date();
  await db.update(conversationMembers).set({ readAt: now }).where(and(eq(conversationMembers.conversationId, conv.id), eq(conversationMembers.userId, userId)));
  const amCreator = conv.buyerId === userId;

  return (
    <div className="max-w-4xl space-y-5">
      <AutoRefresh seconds={20} />
      <header className="space-y-2">
        <p className="text-sm"><Link href="/messages" className="text-muted underline">← Messages</Link></p>
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><Users size={20} /></span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{conv.name || "Groupe"}</h1>
            <p className="truncate text-sm text-muted">{members.map((m) => m.name).join(", ")}</p>
          </div>
          {amCreator ? (
            <form action={deleteConversation}>
              <input type="hidden" name="conversationId" value={conv.id} />
              <ConfirmButton message="Supprimer ce groupe pour tout le monde ? Les messages et pièces jointes disparaissent pour tous les membres." className="btn-ghost shrink-0 text-xs text-muted hover:text-danger">
                <Trash2 size={14} /> Supprimer
              </ConfirmButton>
            </form>
          ) : (
            <LeaveGroupButton conversationId={conv.id} />
          )}
        </div>
      </header>

      <ConversationShell
        conversationId={conv.id} meId={userId} otherId={null} otherName="Le groupe" otherAvatar={null} otherVisible={false}
        otherReadAt={null} lastSeen={null} muted={muted} initialNote="" media={media} initial={liveThread}
        isGroup participantNames={participantNames}
      />
    </div>
  );
}
