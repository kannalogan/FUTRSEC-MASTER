---
name: SENTINEL design system
description: The unified FUTRSEC design language and the token/utility contract every screen redesign must use
---

FUTRSEC's platform-wide redesign uses one design language, "Sentinel" — a calm
security-command-center aesthetic that **deepens** the pre-existing electric-blue /
violet / emerald identity rather than replacing it.

**Why deepen, not replace:** the app already had a working token system, light/dark
theming with a no-flicker boot script, and ~50 pages bound to semantic tokens.
Replacing token *names/values* wholesale would break pages and risk dropping
features (the brief forbids removing any feature/logic). So all original semantic
tokens (`--primary`, `--card`, `--sidebar`, glass tokens, the original
`.text-hero-title`/`.text-page-title`/etc.) keep their exact names and meanings.

**How to apply (all live in `artifacts/futrsec/src/index.css`):**
- Color ramps `--color-{primary,violet,emerald}-50..900` + `-amber/-rose-*` are
  registered in `@theme inline`, so `bg-primary-600`, `text-violet-500` etc. work.
  They are theme-independent brand scales — for charts/accents/emphasis. For chrome
  and content, keep using semantic tokens (never `bg-white`/`text-white` except on
  gradient/accent backgrounds — see dark-theme-convention).
- Roles for accents: electric blue = primary signal; violet = AI surfaces; emerald
  = security-pass/success; amber = warning; rose = danger.
- Elevation is theme-aware: utilities `.elevation-1..4` + `.glow-primary` read
  `--elevation-*` / `--glow-primary`, which are redefined under `.dark` (deeper,
  more opaque). Use these for cards/popovers/modals instead of ad-hoc shadows.
- Motion tokens: `--ease-out-quart`, `--ease-spring`, `--duration-fast/base/slow`.
  Restrained motion only (focus glows, fades, 150–200ms). `prefers-reduced-motion`
  is honored for `.skeleton` + `.hover-lift`.
- Typography scale (utility classes, Poppins headings / Inter body): existing
  hero/page/section/card/kpi/eyebrow/sidebar classes PLUS new `.text-display`,
  `.text-subtitle`, `.text-body-lg`, `.text-body`, `.text-caption`,
  `.text-stat-label`, `.text-table-header`, `.text-badge`, `.num-tabular`.
  Min render size 14px except the specced 12.5–13px chrome labels.
- Loading uses `.skeleton` (theme-aware shimmer). Focus uses `.focus-ring`.

**Rollout:** foundation-first (done), then shared shell (Layout/sidebar/topbar),
then screen-by-screen across the 5 role surfaces — every screen must look like one
product (same spacing/cards/tables/forms); only content & permissions differ.
