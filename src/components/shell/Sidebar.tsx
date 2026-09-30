import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions";
import { Nav } from "@/components/Nav";


const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

export function Sidebar({ user, loanBadge }: { user: { name: string; email: string; roleName: string; isAdmin: boolean; hasUsers: boolean }; loanBadge: number }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-side-line px-4">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-[13px] font-extrabold tracking-tight text-accent-fg">3IS</span>
        <Link href="/" className="text-lg font-semibold tracking-tight text-side-strong">
          Back<span className="text-side-text">stage</span>
        </Link>
      </div>

      {/* Profil en haut du menu, comme le « user panel » d'AdminLTE */}
      <Link href="/profil" className="mx-3 mt-3 flex items-center gap-3 rounded-xl border-b border-side-line px-2 pb-3 text-side-strong hover:bg-side-hover">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-fg ring-2 ring-side-line">{initials(user.name)}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="flex items-center gap-1.5 text-xs text-side-text"><i className="size-1.5 rounded-full bg-[#28a745]" /> {user.roleName}</span>
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto p-3">
        <Nav isAdmin={user.isAdmin} loanBadge={loanBadge} />
      </div>

      <form action={logout} className="border-t border-side-line p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-side-text hover:bg-side-hover hover:text-side-strong">
          <LogOut size={18} /> Déconnexion
        </button>
      </form>
    </>
  );
}
