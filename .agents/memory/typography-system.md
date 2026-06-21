---
name: Typography system
description: FUTRSEC font + type-scale conventions (Poppins headings, Inter body) and where the scale tokens live.
---

# FUTRSEC typography system

Headings use **Poppins** (`--font-heading`), body uses **Inter** (`--font-sans`). Fonts load via Google Fonts `@import` in `src/index.css` AND a `<link>` in `index.html` (keep both in sync to avoid FOUC). `h1–h6` get `font-heading` automatically in `@layer base`.

The type scale lives as custom utility classes in `src/index.css` (`@layer utilities`). Use these instead of ad-hoc `text-*`:
- `.text-hero-title` 48/800 (dashboard greeting hero)
- `.text-page-title` 36/700
- `.text-section-title` 24/700
- `.text-card-title` 16/600
- `.text-kpi` 42/800 (tabular-nums)
- `.text-eyebrow` / `.text-sidebar-section` 13/700 uppercase
- `.text-sidebar-menu` 17/600

Shared primitives already bake the spec in: `ui/card` CardTitle (16/600 Poppins), `ui/table` TableHead (15/700) + TableCell (16/500), `ui/label` (15px), `ui/input` (17px), `ui/button` (cva base `text-base font-bold` = 16/700; `sm` size is `text-sm` not `text-xs`). Sidebar menu item = `.text-sidebar-menu`, icons `h-[22px] w-[22px]`.

**Rule:** never render below 14px, EXCEPT the 13px uppercase section/eyebrow labels (explicit exception). Status `Badge` chips remain `text-xs` (12px) as a pragmatic decorative exception.

**Why:** user-specified design system. Min-14 enforced in touched surfaces (sidebar, dashboard, shared primitives); a full sweep of `text-xs` across all 100+ pages was intentionally NOT done to avoid layout regressions — new/edited UI must follow the rule going forward.

**twMerge caveat:** custom type classes (`.text-kpi`, `.text-card-title`, etc.) are NOT recognized by tailwind-merge, so mixing them with core `text-*` size utilities on the same element leaves both and the CSS-source-order winner is the custom class (defined after `@import "tailwindcss"`). Don't combine a custom type class with a core `text-*` on one element — pick one.
