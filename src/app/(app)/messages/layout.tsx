import { ConversationList } from "@/components/ConversationList";
import { ContentPane, ListPane } from "@/components/MessagesPanes";

// Mise en page partagée par /messages et /messages/[id] : la liste des conversations reste montée en permanence dans
// cette colonne de gauche (elle ne se recharge pas quand on ouvre une conversation, seule l'URL change).
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[22rem_1fr]">
      <ListPane>
        <ConversationList />
      </ListPane>
      <ContentPane>{children}</ContentPane>
    </div>
  );
}
