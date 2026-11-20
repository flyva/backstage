import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { DeleteRoleForm, RoleForm } from "@/components/admin-user-forms";

export const metadata = { title: "Modifier un rôle" };

export default async function EditRolePage({ params }: PageProps<"/admin/roles/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const rid = Number(id);
  if (!Number.isInteger(rid)) notFound();
  const [r] = await db.select().from(roles).where(eq(roles.id, rid)).limit(1);
  if (!r) notFound();
  const system = r.key === "admin" || r.key === "member";

  return (
    <div className="space-y-5">
      <Link href="/admin/roles" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Rôles</Link>
      <h2 className="text-xl font-semibold">{r.name}</h2>
      <div className="card space-y-4">
        <RoleForm role={{ ...r, description: r.description ?? "", system }} />
        {!system && <div className="border-t border-line pt-3"><DeleteRoleForm id={r.id} /></div>}
      </div>
    </div>
  );
}
