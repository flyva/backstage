import { requireAdmin } from "@/lib/auth";
import { AdminBackLink } from "@/components/AdminBackLink";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <div className="space-y-1 print:hidden">
        <AdminBackLink />
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>
      {children}
    </div>
  );
}
