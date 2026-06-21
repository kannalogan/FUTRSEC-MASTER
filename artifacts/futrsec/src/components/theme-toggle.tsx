import { Sun, Moon, Laptop } from "lucide-react";
import { usePersistedTheme, type Theme } from "@/hooks/use-theme";

const OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

/** Compact 3-way segmented control — used in the sidebar footer (all roles). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = usePersistedTheme();
  return (
    <div
      className={`flex items-center gap-1 rounded-xl bg-muted/60 p-1 ring-1 ring-border ${className}`}
      role="radiogroup"
      aria-label="Color theme"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={`flex-1 flex items-center justify-center rounded-lg py-1.5 transition-colors ${
              active
                ? "bg-card text-primary shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <opt.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Labelled radio cards — used in the Settings → Appearance section. */
export function ThemeSelector() {
  const { theme, setTheme } = usePersistedTheme();
  return (
    <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
              active
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <opt.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
            <span className="text-sm font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
