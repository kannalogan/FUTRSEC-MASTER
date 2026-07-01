import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Sidebar, primaryNavForRole } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { CommandPalette } from "@/components/command-palette";
import { CookieBanner } from "@/components/cookie-banner";
import { useAuth } from "@/hooks/use-auth";
import { Menu, Search, Shield } from "lucide-react";

function MobileBottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();
  const items = primaryNavForRole(user?.role ?? null);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-xl">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      {/* Desktop sidebar — 300px */}
      <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-r border-sidebar-border overflow-hidden">
        <Sidebar />
      </aside>

      {/* Tablet / mobile drawer overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            className="relative z-10 w-[300px] max-w-[85vw] h-full shadow-2xl"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setMobileSidebarOpen(false);
            }}
          >
            <Sidebar onClose={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Desktop top navigation */}
        <Topbar onOpenSearch={() => setSearchOpen(true)} />

        {/* Mobile / tablet header */}
        <header className="lg:hidden h-14 border-b border-sidebar-border bg-sidebar flex items-center px-3 gap-2 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading font-bold text-sm tracking-tight text-sidebar-foreground">FUTRSEC</span>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin pb-20 lg:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
      <CookieBanner />
    </div>
  );
}
