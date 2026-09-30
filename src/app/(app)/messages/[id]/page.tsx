import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, listings, messages, reviews, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { messageCountsBySender, ratingSummary } from "@/lib/messaging";
import { ago } from "@/lib/relative-time";
import { Avatar } from "@/components/people-forms";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MessageComposer, ReviewForm } from "@/components/message-forms";
import { RatingBadge, Stars } from "@/components/Stars";

export const metadata = { title: "Conversation" };

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
    db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt)),
    db.select({ id: users.id, name: users.name, avatar: users.avatarFile }).from(users).where(eq(users.id, otherId)).limit(1),
    db.select({ id: listings.id, title: listings.title, status: listings.status }).from(listings).where(eq(listings.id, conv.listingId)).limit(1),
    messageCountsBySender(id),
    ratingSummary([otherId]),
    db.select().from(reviews).where(and(eq(reviews.authorId, user.id), eq(reviews.listingId, conv.listingId), eq(reviews.subjectId, otherId))).limit(1),
  ]);

  // Lu à l'ouverture : la date de lecture dépasse celle du dernier message.
  await db.update(conversations).set(iAmBuyer ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() }).where(eq(conversations.id, id));

  const canReview = (counts.get(conv.buyerId) ?? 0) >= 1 && (counts.get(conv.sellerId) ?? 0) >= 1;
  const rating = ratings.get(otherId);

  return (
    <div className="max-w-3xl space-y-5">
      <AutoRefresh seconds={8} />
      <header className="space-y-2">
        <p className="text-sm"><Link href="/messages" className="text-muted underline">← Messages</Link></p>
        <div className="flex items-center gap-3">
          <Avatar name={other?.name ?? "?"} url={avatarUrl(other?.avatar)} size={48} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{other?.name ?? "Personne supprimée"}</h1>
            {rating && <RatingBadge avg={rating.avg} n={rating.n} />}
          </div>
        </div>
        <p className="text-sm text-muted">
          À propos de{" "}
          {listing ? <Link href={`/annonces/${listing.id}`} className="font-medium text-fg underline">{listing.title}</Link> : "une annonce supprimée"}
          {listing?.status === "closed" && <span> · annonce terminée</span>}
        </p>
      </header>

      <section className="card space-y-3" aria-label="Messages">
        {thread.length === 0 && <p className="text-sm text-muted">Aucun message.</p>}
        <ul className="space-y-3">
          {thread.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-accent text-accent-fg" : "border border-line bg-bg"}`}>
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "opacity-70" : "text-muted"}`}>{dayFmt.format(m.createdAt)} · {ago(m.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-line pt-3"><MessageComposer conversationId={id} /></div>
      </section>

      {other && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Ton avis sur {other.name}</h2>
          {canReview ? (
            <>
              <p className="text-sm text-muted">Une note et un commentaire sur la personne et l&apos;échange : ils sont visibles par toute la promo.</p>
              {myReview && <p className="flex items-center gap-2 text-sm"><Stars value={myReview.rating} /> <span className="text-muted">Ton avis actuel, modifiable ci-dessous.</span></p>}
              <ReviewForm conversationId={id} subjectName={other.name} initialRating={myReview?.rating ?? 0} initialComment={myReview?.comment ?? ""} />
            </>
          ) : (
            <p className="text-sm text-muted">Tu pourras laisser un avis quand vous aurez tous les deux écrit au moins un message.</p>
          )}
        </section>
      )}
    </div>
  );
}
