"use client";

import { useState } from "react";
import { LiveThread } from "@/components/LiveThread";
import { MessageComposer } from "@/components/message-forms";
import type { LiveMessage } from "@/lib/message-bus";

// Relie le fil en direct et le composeur : un clic sur « Répondre » dans le fil ouvre l'aperçu de citation dans le composeur.
export function ConversationPanel({ conversationId, meId, otherName, otherReadAt, initial }: {
  conversationId: number; meId: number; otherName: string; otherReadAt: string | null; initial: LiveMessage[];
}) {
  const [replyTo, setReplyTo] = useState<LiveMessage | null>(null);
  return (
    <>
      <LiveThread conversationId={conversationId} meId={meId} otherName={otherName} otherReadAt={otherReadAt} initial={initial} onReply={setReplyTo} />
      <div className="border-t border-line pt-3">
        <MessageComposer conversationId={conversationId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>
    </>
  );
}
