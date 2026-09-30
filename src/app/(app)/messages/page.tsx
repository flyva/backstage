import Link from "next/link";
import { desc, eq, inArray, or } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import { db } from "@/db";
import { conversations, listings, messages, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_PHOTO_PREFIX } from "@/lib/listing-shared";
import { ago } from "@/lib/relative-time";
import { Avatar } from "@/components/people-forms";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser();
  const convs = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.buyerId, user.id), eq(conversations.sellerId, user.id)))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);
  const ids = convs.map((c) => c.id);
  const others = [...new Set(convs.map((c) => (c.buyerId === user.id ? c.sellerId : c.buyerId)))];
  const [people, lots, last] = await Promise.all([
    others.length ? db.select({ id: users.id, name: users.name, avatar: users.avatarFile }).from(users).where(inArray(users.id, others)) : [],
    convs.length ? db.select({ id: listings.id, title: listings.title, photo: listings.photoFile }).from(listings).where(inArray(listings.id, convs.map((c) => c.listingId))) : [],
    ids.length ? db.select({ conversationId: messages.conversationId, body: messages.body, senderId: messages.senderId }).from(messages).where(inArray(messages.conversationId, ids)).orderBy(desc(messages.createdAt)).limit(500) : [],
  ]);
  const person = new Map(people.map((p) => [p.id, p]));
  const title = new Map(lots.map((l) => [l.id, l.title]));
  const photo = new Map(lots.map((l) => [l.id, l.photo]));
  const lastOf = new Map<number, { body: string; senderId: number }>();
  for (const m of last) if (!lastOf.has(m.conversationId)) lastOf.set(m.conversationId, m);

  return (
    <div className="max-w-3xl space-y-5">
      <AutoRefresh seconds={10} />
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><MessageSquare size={24} className="text-accent" /> Messages</h1>
        <p className="text-sm text-muted">Tes conversations à propos des annonces. Seules les deux personnes concernées les voient.</p>
      </header>
      {convs.length === 0 && (
        <div className="card text-sm text-muted">Aucune conversation pour le moment. Ouvre une <Link href="/annonces" className="text-accent underline">annonce</Link> et écris à son auteur.</div>
      )}
      <ul className="space-y-2">
        {convs.map((c) => {
          const mine = c.buyerId === user.id;
          const otherId = mine ? c.sellerId : c.buyerId;
          const p = person.get(otherId);
          const readAt = mine ? c.buyerReadAt : c.sellerReadAt;
          const unread = !readAt || readAt.getTime() < c.lastMessageAt.getTime();
          const m = lastOf.get(c.id);
          return (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className={`card flex items-center gap-3 p-4 hover:border-accent ${unread ? "border-accent" : ""}`}>
                <Avatar name={p?.name ?? "?"} url={avatarUrl(p?.avatar)} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{p?.name ?? "Personne supprimée"}</span>
                    <span className="shrink-0 text-xs text-muted">· {mine ? "tu achètes" : "tu vends"}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">{ago(c.lastMessageAt)}</span>
                  </div>
                  <div className="truncate text-sm text-muted">{title.get(c.listingId) ?? "Annonce"}</div>
                  {m && <div className={`truncate text-sm ${unread ? "font-medium" : "text-muted"}`}>{m.senderId === user.id ? "Toi : " : ""}{m.body}</div>}
                </div>
                {photo.get(c.listingId) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${LISTING_PHOTO_PREFIX}${photo.get(c.listingId)}`} alt="" className="size-12 shrink-0 rounded-lg border border-line object-cover" loading="lazy" />
                )}
                {unread && <span className="size-2.5 shrink-0 rounded-full bg-accent" aria-label="Non lu" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
