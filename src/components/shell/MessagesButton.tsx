import Link from "next/link";
import { MessageSquare } from "lucide-react";

// Raccourci vers la messagerie, à côté de la recherche : évite de dédier une entrée au menu de gauche.
export function MessagesButton({ unread }: { unread: number }) {
  return (
    <Link
      href="/messages"
      aria-label={unread > 0 ? `Messages : ${unread} non lu${unread > 1 ? "s" : ""}` : "Messages"}
      className="relative grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg"
    >
      <MessageSquare size={16} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#dc3545] px-1 text-[10px] font-semibold leading-4 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
