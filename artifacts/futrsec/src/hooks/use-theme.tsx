import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "futrsec-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    readStoredTheme() === "system" ? getSystemTheme() : (readStoredTheme() as ResolvedTheme),
  );

  // Apply theme whenever the preference changes.
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
    // Enable color transitions only after first paint to avoid a load flash.
    const id = requestAnimationFrame(() => document.documentElement.classList.add("theme-ready"));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  // Follow the OS when in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    setThemeState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

const themeQueryKey = (token: string | null) => ["/api/settings/theme", token] as const;

/**
 * Like useTheme, but treats the database as the source of truth:
 * changing the theme updates localStorage (cache) + applies globally + persists to DB.
 * Use this in any UI control that lets the user pick a theme.
 */
export function usePersistedTheme() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const setThemePersisted = useCallback(
    (next: Theme) => {
      setTheme(next); // 1. cache in localStorage  2. apply globally
      if (token) {
        // 3. DB is the source of truth — persist, and optimistically keep the query
        // cache in sync so ThemeSync doesn't reconcile back to a stale value.
        queryClient.setQueryData(themeQueryKey(token), { theme: next });
        apiFetch("/api/settings/theme", {
          method: "PUT",
          body: JSON.stringify({ theme: next }),
        }).catch(() => {
          // Write failed (offline / server error): the DB is still authoritative,
          // so refetch it and let ThemeSync revert the optimistic local change.
          queryClient.invalidateQueries({ queryKey: themeQueryKey(token) });
        });
      }
    },
    [setTheme, token, queryClient],
  );

  return { theme, resolvedTheme, setTheme: setThemePersisted };
}

/**
 * Reconciles the DB theme preference (source of truth) into the app after login,
 * so the theme stays consistent across devices and browsers. localStorage is only
 * a cache used for the instant no-flicker first paint. Render once inside AuthProvider.
 */
export function ThemeSync() {
  const { token } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data } = useQuery({
    queryKey: themeQueryKey(token),
    queryFn: () => apiFetch<{ theme: Theme }>("/api/settings/theme"),
    enabled: !!token,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data?.theme && data.theme !== theme) {
      setTheme(data.theme); // DB wins: applies + refreshes the localStorage cache
    }
  }, [data?.theme, theme, setTheme]);

  return null;
}
