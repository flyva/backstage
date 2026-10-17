import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { todayParis } from "@/lib/equipment";
import { ExpenseNoteForm } from "@/components/alternance-forms";

export const metadata = { title: "Nouvelle note de frais" };

export default async function NewExpenseNotePage() {
  await requireUser();
  const today = todayParis();
  const now = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm"><Link href="/alternance/notes-de-frais" className="inline-flex items-center gap-1 text-muted hover:text-fg"><ArrowLeft size={14} /> Notes de frais</Link></p>
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Receipt size={22} className="text-accent" /> Nouvelle note de frais</h1>
      <div className="card">
        <ExpenseNoteForm today={today} now={now} />
      </div>
    </div>
  );
}
