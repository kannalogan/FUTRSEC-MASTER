---
name: Theme convention (futrsec)
description: How the futrsec frontend implements Light/Dark/System theming and the rule new UI must follow to work in both themes.
---

# Light/Dark/System theme system

The futrsec frontend supports **Light, Dark, and System** themes (all roles). Light is the `:root` default; Dark lives under `.dark` in `artifacts/futrsec/src/index.css`. The pre-React inline script in `index.html` sets `.dark` + `color-scheme` from `localStorage["futrsec-theme"]` + system preference before first paint (no FOUC). `ThemeProvider` (`src/hooks/use-theme.tsx`) is mounted high in `App.tsx` and keeps the class in sync; `theme-toggle.tsx` exports `ThemeToggle` (sidebar segmented control) + `ThemeSelector` (Settings radio cards).

**Rule:** new UI must use semantic tokens (`bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, sidebar tokens `text-sidebar-foreground` / `bg-sidebar-accent` / `border-sidebar-border`) — NOT hardcoded `bg-white`, `text-white`, `bg-white/[0.0x]`, `ring-white/xx`, or `rgba(255,255,255,…)`. Those break in light mode (invisible) or were dark-only hacks.

**Why:** the platform was previously dark-by-default (both `:root` and `.dark` were dark, `index.html` hardcoded `class="dark"`). Adding the theme system flipped `:root` to light. Any hardcoded white-on-transparent surface now renders wrong in light mode.

**How to apply:**
- Cards: `bg-card` or `.glass-card` (now theme-aware via `--glass-bg/--glass-border/--glass-shadow` tokens per theme).
- Subtle surfaces/hover: `bg-muted/40`, `ring-border`, `hover:bg-muted/70`.
- `text-white` is ONLY correct on a colored gradient/accent background (logo/avatar/badge with `bg-gradient-…` or `bg-primary`) — it stays white in both themes there. Everywhere else use `text-foreground`/`text-sidebar-foreground`.
- Opacity-on-foreground (`text-sidebar-foreground/55`) works in both themes since foreground flips per theme.
- Brand accent hex (`#3B82F6` blue, `#8B5CF6` violet, `#10B981` emerald) and per-track colors are intentionally **identical in both themes** — inline hex/gradients for these are fine.
- Global 300ms color transition is gated behind `.theme-ready` (added after first paint) to avoid load-flash. SVG theme-sensitive strokes use `stroke="hsl(var(--border))"`, not `rgba(255,255,255,…)`.

# Sidebar role isolation

`Sidebar` picks exactly one nav set via `navForRole(role)` (admin/mentor/tpo/employer/student-default) — never merge or append blocks across roles. Track badge + locked "Explore" tracks render ONLY when `isStudent`. `ADMIN_NAV` is the admin-only menu; keep it self-contained.
