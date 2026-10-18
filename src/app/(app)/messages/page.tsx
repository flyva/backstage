import { MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Messages" };

// Affiché dans la colonne de droite quand aucune conversation n'est ouverte (desktop uniquement : sur mobile, c'est
// la liste qui occupe l'écran à cette adresse).
export default async function MessagesPage() {
  await requireUser();
  return (
    <div className="card flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center text-muted">
      <MessageSquare size={32} className="text-muted" />
      <p className="text-sm">Choisis une conversation dans la liste à gauche.</p>
    </div>
  );
}
