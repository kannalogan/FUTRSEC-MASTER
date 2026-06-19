import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, LayoutDashboard, Shield, User, ChevronRight } from "lucide-react";
import { useLogout } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout: localLogout } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        localLogout();
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-background font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col text-sidebar-foreground">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight text-white">
            <Shield className="h-6 w-6 text-primary" />
            FUTRSEC
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <Link href="/privacy" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === '/privacy' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
            <Shield className="h-5 w-5" />
            Privacy Center
          </Link>
          {/* Add more nav items here */}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-sidebar-foreground/70" />
            <span className="text-sm font-medium text-sidebar-foreground/70">Log out</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-background">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 md:hidden">
            <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight">
              <Shield className="h-6 w-6 text-primary" />
              FUTRSEC
            </div>
        </header>
        
        <div className="flex-1 overflow-auto">
          <div className="p-6 md:p-10 max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
