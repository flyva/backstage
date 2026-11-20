import Link from "next/link";
import { AdminLink, Nav } from "@/components/Nav";

const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function Sidebar({ user, loanBadge }: { user: { name: string; email: string; roleName: string; isAdmin: boolean; views: Record<string, boolean>; hiddenPages: string[]; avatar?: string | null }; loanBadge: number }) {
  return (
    <>
      {/* En-tête : logo + nom, comme chez BDE. */}
      <Link href="/" className="flex shrink-0 items-center gap-2.5 px-5 pb-5 pt-5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-[13px] font-bold text-accent-fg">3IS</span>
        <span className="text-[15px] font-bold text-side-strong">Backstage</span>
      </Link>

      <div className="no-scrollbar flex-1 overflow-y-auto px-2.5">
        <Nav isAdmin={user.isAdmin} views={user.views} hiddenPages={user.hiddenPages} loanBadge={loanBadge} />
      </div>

      {/* Même emplacement que BDE : lien Administration puis profil, tout en bas, hors du défilement. */}
      {user.isAdmin && (
        <div className="px-2.5 pt-1">
          <AdminLink />
        </div>
      )}
      <div className="border-t border-side-line p-2.5">
        <Link href="/profil" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-side-text transition hover:bg-side-hover hover:text-side-strong">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" width={26} height={26} className="size-[26px] shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">{initial(user.name)}</span>
          )}
          <span className="truncate text-[13.5px]">{firstName(user.name)}</span>
        </Link>
      </div>
    </>
  );
}
