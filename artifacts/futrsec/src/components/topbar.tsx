import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { useUnreadNotificationCount } from "@/lib/notifications-api";
import { navForRole } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search, Bell, User, Settings, LogOut, ChevronRight } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/** Humanize a route segment, e.g. "job-agent" → "Job Agent". */
function humanize(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve the current location into breadcrumb crumbs, preferring known nav labels. */
function useBreadcrumbs(): { label: string; href: string }[] {
  const [location] = useLocation();
  const { user } = useAuth();
  const segments = location.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const labelByHref = new Map<string, string>();
  for (const section of navForRole(user?.role ?? null)) {
    for (const item of section.items) labelByHref.set(item.href, item.label);
  }

  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    crumbs.push({ label: labelByHref.get(acc) ?? humanize(seg), href: acc });
  }
  return crumbs;
}

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { user, logout: localLogout } = useAuth();
  const logoutMutation = useLogout();
  const { data: unreadCount } = useUnreadNotificationCount();
  const crumbs = useBreadcrumbs();
  const role = user?.role ?? "student";

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => localLogout() });
  };

  const initial =
    user?.fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="hidden lg:flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/90 backdrop-blur-lg px-5 sticky top-0 z-30">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0">
        {crumbs.length === 0 ? (
          <span className="text-body font-medium text-foreground">Home</span>
        ) : (
          crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <div key={crumb.href} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                {isLast ? (
                  <span className="text-body font-medium text-foreground truncate">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-body text-muted-foreground hover:text-foreground transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="flex-1" />

      {/* Global search trigger (⌘K) */}
      <button
        onClick={onOpenSearch}
        className="focus-ring group flex items-center gap-2 rounded-lg border border-input bg-card/50 px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="text-caption hidden xl:inline">Search…</span>
        <kbd className="hidden xl:inline-flex items-center gap-0.5 rounded border border-input bg-muted px-1 py-0.5 text-badge text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Notifications */}
      <Link
        href="/notifications"
        className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount && unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-badge font-semibold text-white num-tabular">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>

      <ThemeToggle />

      {/* Profile menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="focus-ring flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-accent"
            aria-label="Account menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-violet/20 border border-border">
              <span className="text-caption font-semibold text-foreground">{initial}</span>
            </div>
            <div className="hidden min-w-0 text-left xl:block">
              <p className="text-caption font-medium text-foreground leading-tight truncate max-w-[120px]">
                {user?.fullName ?? user?.email ?? "Account"}
              </p>
              <p className="text-badge capitalize text-muted-foreground leading-tight">{role}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 elevation-3">
          <DropdownMenuLabel className="truncate text-card-title">
            {user?.fullName ?? user?.email ?? "Account"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer text-body">
              <User className="mr-2 h-4 w-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer text-body">
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-body text-danger focus:text-danger">
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
