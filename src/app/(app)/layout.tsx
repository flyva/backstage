import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { Nav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut } from "lucide-react";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <aside className="print:hidden flex flex-col gap-4 border-b border-line bg-surface p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between md:block">
          <div className="text-lg font-bold tracking-tight">
            Back<span className="text-accent">stage</span>
          </div>
          <div className="text-xs text-muted md:mt-0.5">3IS · Régie technique</div>
        </div>
        <Nav isAdmin={user.role === "admin"} />
        <div className="mt-auto hidden space-y-3 md:block">
          <ThemeToggle current={user.theme} />
          <div className="truncate text-sm">
            <div className="truncate font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
          <form action={logout}>
            <button className="btn-ghost w-full"><LogOut size={16} /> Déconnexion</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-surface p-3 md:hidden print:hidden">
        <ThemeToggle current={user.theme} />
        <form action={logout}>
          <button className="btn-ghost"><LogOut size={16} /> Déconnexion</button>
        </form>
      </div>
    </div>
  );
}
