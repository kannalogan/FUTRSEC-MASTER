import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Menu } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-60 shrink-0 flex-col border-r border-white/5 overflow-hidden">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 h-full">
            <Sidebar onClose={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden h-12 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-heading font-bold text-sm tracking-tight">FUTRSEC</span>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
