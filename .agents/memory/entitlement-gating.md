---
name: Entitlement & paywall gating
description: How to correctly gate premium features and track-specific plans against bypass via direct API calls
---

# Entitlement & paywall gating

Two business-access-control rules that are easy to get wrong and were caught in review:

## 1. Premium gates must check subscription STATUS, not just plan name
A premium/entitlement check must require `subscription.status === "active"` (and ideally a non-expired `endDate`), **not** only a `plan` name prefix like `premium*`/`corporate`.

**Why:** a canceled or expired subscription row keeps its `plan` value. Checking only the plan name lets a lapsed user keep unlocking gated features (e.g. job-agent auto-apply). The combined gate is: active+non-expired premium AND feature prerequisite (e.g. CP5 complete) AND not on trial.

**How to apply:** any feature-lock helper (`isPremiumPlan`, auto-apply gate, etc.) — gate on status+expiry first, then plan tier.

## 2. Track-specific plans need server-side track validation
Track-scoped premium plans (`premium_soc`/`premium_vapt`/`premium_grc` carry a `careerTrack`) must reject purchase when `plan.careerTrack !== user.careerTrack` in the server (`changePlan` in lib/billing.ts), returning 403.

**Why:** frontend filtering of the plans grid is cosmetic; a direct POST to the change-plan endpoint bypasses it and grants cross-track entitlement. This is the same career_track-is-auth-source-of-truth principle as track-locked-rbac.

**How to apply:** throw a typed error (`TrackMismatchError`, code `TRACK_MISMATCH`) from the billing layer and map it to 403 in the route catch block (alongside the existing `NotConfiguredError` handling).
