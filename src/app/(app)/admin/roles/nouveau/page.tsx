import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { RoleForm } from "@/components/admin-user-forms";

export const metadata = { title: "Créer un rôle" };

export default async function NewRolePage() {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <Link href="/admin/roles" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Rôles</Link>
      <h2 className="text-xl font-semibold">Créer un rôle</h2>
      <div className="card">
        <RoleForm />
      </div>
    </div>
  );
}
