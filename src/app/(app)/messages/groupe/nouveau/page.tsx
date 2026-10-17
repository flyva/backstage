import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { NewGroupForm } from "@/components/message-forms";

export const metadata = { title: "Nouveau groupe" };

export default async function NewGroupPage() {
  await requireUser();
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm"><Link href="/messages" className="inline-flex items-center gap-1 text-muted hover:text-fg"><ArrowLeft size={14} /> Messages</Link></p>
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Users size={22} className="text-accent" /> Nouveau groupe</h1>
      <div className="card">
        <NewGroupForm />
      </div>
    </div>
  );
}
