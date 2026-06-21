---
name: Dark theme convention (futrsec)
description: How the futrsec frontend applies its dark theme and the rule new UI must follow to not break on dark.
---

# Dark-by-default theme

The futrsec frontend is **dark-by-default**. The premium dark palette lives in `:root` in `artifacts/futrsec/src/index.css` (not gated behind a `.dark` toggle); `.dark` mirrors it and `index.html` also sets `class="dark"`.

**Rule:** new UI must use semantic tokens (`bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) — NOT hardcoded light colors. `bg-white` and `bg-{gray,slate}-50/100` render as light boxes on the dark surface and look broken.

**Why:** a prior redesign flipped the whole platform to dark by changing `:root`; 142 hardcoded `bg-white` usages had to be swept to `bg-card`. Reintroducing hardcoded light colors regresses that.

**How to apply:** for cards use `bg-card` or the `.glass-card` utility; for subtle status chips use accent tints with opacity (e.g. `bg-emerald/10`, `bg-primary/15`). Typography helpers exist: `.text-page-title` (40), `.text-section-title` (24), `.text-card-title` (18), `.text-eyebrow` (13 uppercase).

# Sidebar role isolation

`Sidebar` picks exactly one nav set via `navForRole(role)` (admin/mentor/tpo/employer/student-default) — never merge or append blocks across roles. Track badge + locked "Explore" tracks render ONLY when `isStudent`. `ADMIN_NAV` is the admin-only menu; keep it self-contained.
