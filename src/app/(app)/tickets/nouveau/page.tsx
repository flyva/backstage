import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TicketCreateForm } from "@/components/ticket-forms";

export const metadata = { title: "Nouveau ticket" };

export default async function NewTicketPage() {
  await requireUser();
  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm"><Link href="/tickets" className="text-muted underline">← Tickets</Link></p>
      <h1 className="text-2xl font-bold">Nouveau ticket</h1>
      <div className="card">
        <TicketCreateForm />
      </div>
    </div>
  );
}
