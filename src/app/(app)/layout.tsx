import { requireUser } from "@/lib/auth";
import { loadNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/shell/AppShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { avatarUrl } from "@/lib/avatar-files";
import { NotificationBell } from "@/components/shell/NotificationBell";
import { HeaderClock } from "@/components/shell/HeaderClock";
import { QuickTheme } from "@/components/shell/SkinControls";
import { skinFrom } from "@/lib/skin";
import { UserMenu } from "@/components/shell/UserMenu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const admin = user.perms.administration;
  const { items, unread, loanBadge, messageBadge, ticketsBadge } = await loadNotifications(user);

  return (
    <AppShell
      sidebar={<Sidebar user={{ name: user.name, email: user.email, roleName: user.roleName, isAdmin: user.perms.administration, views: { ...user.perms.view, ...user.perms.sections, ...user.perms.courses }, avatar: avatarUrl(user.avatarFile) }} loanBadge={loanBadge} messageBadge={messageBadge} ticketsBadge={ticketsBadge} />}
      bell={<><HeaderClock /><QuickTheme initial={skinFrom(user)} /><NotificationBell items={items} unread={unread} /></>}
      menu={<UserMenu name={user.name} email={user.email} isAdmin={admin} />}
    >
      {children}
    </AppShell>
  );
}
