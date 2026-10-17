import Link from "next/link";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { MessageSquare, Trash2, Users, UserPlus } from "lucide-react";
import { db } from "@/db";
import { conversationMembers, conversations, listings, messages, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar-files";
import { LISTING_PHOTO_PREFIX } from "@/lib/listing-shared";
import { deleteConversation } from "@/lib/message-actions";
import { ago } from "@/lib/relative-time";
import { Avatar } from "@/components/people-forms";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser();
  const groupIds = (await db.select({ id: conversationMembers.conversationId }).from(conversationMembers).where(and(eq(conversationMembers.userId, user.id), isNull(conversationMembers.leftAt)))).map((r) => r.id);
  const visibility = [and(ne(conversations.kind, "group"), or(eq(conversations.buyerId, user.id), eq(conversations.sellerId, user.id)))!];
  if (groupIds.length) visibility.push(inArray(conversations.id, groupIds));
  const convs = await db
    .select()
    .from(conversations)
    .where(or(...visibility))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);
  const ids = convs.map((c) => c.id);
  const groupConvIds = convs.filter((c) => c.kind === "group").map((c) => c.id);
  const others = [...new Set(convs.filter((c) => c.kind !== "group").map((c) => (c.buyerId === user.id ? c.sellerId : c.buyerId)))];
  const listingIds = [...new Set(convs.map((c) => c.listingId).filter((id) => id !== null))];
  const [people, lots, last, myMemberships, groupMembers] = await Promise.all([
    others.length ? db.select({ id: users.id, name: users.name, avatar: users.avatarFile }).from(users).where(inArray(users.id, others)) : [],
    listingIds.length ? db.select({ id: listings.id, title: listings.title, photo: listings.photoFile }).from(listings).where(inArray(listings.id, listingIds)) : [],
    ids.length ? db.select({ conversationId: messages.conversationId, body: messages.body, senderId: messages.senderId }).from(messages).where(inArray(messages.conversationId, ids)).orderBy(desc(messages.createdAt)).limit(500) : [],
    groupConvIds.length ? db.select({ conversationId: conversationMembers.conversationId, readAt: conversationMembers.readAt }).from(conversationMembers).where(and(inArray(conversationMembers.conversationId, groupConvIds), eq(conversationMembers.userId, user.id))) : [],
    groupConvIds.length ? db.select({ conversationId: conversationMembers.conversationId, n: conversationMembers.id }).from(conversationMembers).where(and(inArray(conversationMembers.conversationId, groupConvIds), isNull(conversationMembers.leftAt))) : [],
  ]);
  const person = new Map(people.map((p) => [p.id, p]));
  const title = new Map(lots.map((l) => [l.id, l.title]));
  const photo = new Map(lots.map((l) => [l.id, l.photo]));
  const lastOf = new Map<number, { body: string; senderId: number }>();
  for (const m of last) if (!lastOf.has(m.conversationId)) lastOf.set(m.conversationId, m);
  const myReadAt = new Map(myMemberships.map((m) => [m.conversationId, m.readAt]));
  const memberCount = new Map<number, number>();
  for (const m of groupMembers) memberCount.set(m.conversationId, (memberCount.get(m.conversationId) ?? 0) + 1);

  return (
    <div className="max-w-3xl space-y-5">
      <AutoRefresh seconds={10} />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><MessageSquare size={24} className="text-accent" /> Messages</h1>
          <p className="text-sm text-muted">Messages directs, groupes, et conversations à propos des annonces. Seules les personnes concernées les voient.</p>
        </div>
        <Link href="/messages/groupe/nouveau" className="btn-ghost shrink-0"><UserPlus size={15} /> Nouveau groupe</Link>
      </header>
      {convs.length === 0 && (
        <div className="card text-sm text-muted">Aucune conversation pour le moment. Écris à quelqu&apos;un depuis sa <Link href="/annuaire" className="text-accent underline">fiche annuaire</Link>, ou depuis une <Link href="/annonces" className="text-accent underline">annonce</Link>.</div>
      )}
      <ul className="space-y-2">
        {convs.map((c) => {
          const isGroup = c.kind === "group";
          const mine = c.buyerId === user.id;
          const otherId = mine ? c.sellerId : c.buyerId;
          const p = isGroup ? null : person.get(otherId);
          const readAt = isGroup ? myReadAt.get(c.id) : (mine ? c.buyerReadAt : c.sellerReadAt);
          const unread = !readAt || readAt.getTime() < c.lastMessageAt.getTime();
          const m = lastOf.get(c.id);
          const isListing = c.listingId !== null;
          return (
            <li key={c.id} className={`card flex items-center gap-3 p-4 hover:border-accent ${unread ? "border-accent" : ""}`}>
              <Link href={`/messages/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                {isGroup ? (
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><Users size={18} /></span>
                ) : (
                  <Avatar name={p?.name ?? "?"} url={avatarUrl(p?.avatar)} size={44} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{isGroup ? (c.name || "Groupe") : (p?.name ?? "Personne supprimée")}</span>
                    {isListing && <span className="shrink-0 text-xs text-muted">· {mine ? "tu achètes" : "tu vends"}</span>}
                    {isGroup && <span className="shrink-0 text-xs text-muted">· {memberCount.get(c.id) ?? 0} membres</span>}
                    <span className="ml-auto shrink-0 text-xs text-muted">{ago(c.lastMessageAt)}</span>
                  </div>
                  <div className="truncate text-sm text-muted">{isListing ? (title.get(c.listingId!) ?? "Annonce") : isGroup ? "Groupe" : "Message direct"}</div>
                  {m && <div className={`truncate text-sm ${unread ? "font-medium" : "text-muted"}`}>{m.senderId === user.id ? "Toi : " : ""}{m.body || "📎 Pièce jointe"}</div>}
                </div>
                {isListing && photo.get(c.listingId!) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${LISTING_PHOTO_PREFIX}${photo.get(c.listingId!)}`} alt="" className="size-12 shrink-0 rounded-lg border border-line object-cover" loading="lazy" />
                )}
                {unread && <span className="size-2.5 shrink-0 rounded-full bg-accent" aria-label="Non lu" />}
              </Link>
              {(!isGroup || c.buyerId === user.id) && (
                <form action={deleteConversation}>
                  <input type="hidden" name="conversationId" value={c.id} />
                  <ConfirmButton message={isGroup ? "Supprimer ce groupe pour tout le monde ?" : "Supprimer définitivement cette conversation ?"} className="shrink-0 rounded-lg p-2 text-muted hover:bg-bg hover:text-danger">
                    <Trash2 size={16} aria-label="Supprimer" />
                  </ConfirmButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
