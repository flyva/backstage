"use client";

import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { ConversationPanel } from "@/components/ConversationPanel";
import { ConversationSidebar, type SharedMedia } from "@/components/ConversationSidebar";
import type { LiveMessage } from "@/lib/message-bus";

export function ConversationShell({
  conversationId, meId, otherId, otherName, otherAvatar, otherOnline, otherVisible, otherReadAt, lastSeen, seen, muted, initialNote, media, initial, isGroup, participantNames,
}: {
  conversationId: number; meId: number; otherId: number | null; otherName: string; otherAvatar: string | null; otherOnline?: boolean; otherVisible: boolean;
  otherReadAt: string | null; lastSeen: string | null; seen?: boolean; muted: boolean; initialNote: string; media: SharedMedia[]; initial: LiveMessage[];
  isGroup?: boolean; participantNames?: Record<number, string>;
}) {
  const [showInfo, setShowInfo] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className={`grid items-start gap-5 ${showInfo ? "lg:grid-cols-[1fr_20rem]" : ""}`}>
      <section className="card space-y-3" aria-label="Messages">
        <div className="flex justify-end">
          <button
            type="button" onClick={() => setShowInfo((v) => !v)}
            className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-fg"
            aria-label={showInfo ? "Passer en pleine page" : "Afficher les informations"}
            title={showInfo ? "Passer en pleine page" : "Afficher les informations"}
          >
            {showInfo ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
        <ConversationPanel
          conversationId={conversationId} meId={meId} otherName={otherName} otherReadAt={otherReadAt} initial={initial}
          isGroup={isGroup} participantNames={participantNames} searchQuery={searchQuery}
        />
      </section>
      {showInfo && (
        <ConversationSidebar
          conversationId={conversationId} otherId={otherId} otherName={otherName} otherAvatar={otherAvatar} otherOnline={otherOnline} otherVisible={otherVisible}
          lastSeen={lastSeen} seen={seen} muted={muted} initialNote={initialNote} media={media} onSearch={setSearchQuery}
        />
      )}
    </div>
  );
}
