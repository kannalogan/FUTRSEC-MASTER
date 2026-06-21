// Single source of truth for role-based post-login routing.
// Every authenticated role has exactly one landing page. Non-students must
// NEVER be sent to the student dashboard.

export function landingPathForRole(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "mentor":
      return "/mentor/overview";
    case "tpo":
      return "/tpo/dashboard";
    case "employer":
      return "/employer/dashboard";
    case "student":
      return "/dashboard";
    default:
      // Unknown / missing role — force re-authentication rather than guessing.
      return "/login";
  }
}

// Resolve the gate destination for an approval-required role (tpo/employer):
// approved -> role dashboard, rejected -> rejected screen, otherwise -> review.
export function approvalGatePath(
  role: string | null | undefined,
  approvalStatus: string | null | undefined,
): string {
  if (approvalStatus === "approved") return landingPathForRole(role);
  if (approvalStatus === "rejected") return "/onboarding/rejected";
  return "/onboarding/pending";
}

// Where to send a user immediately after a successful login. Students may still
// be mid-onboarding; tpo/employer pass through an approval gate; everyone else
// goes straight to their role landing page.
export function postLoginPath(user: {
  role?: string | null;
  onboardingStep?: string | null;
  approvalStatus?: string | null;
}): string {
  const step = user.onboardingStep ?? undefined;

  // Approval gate (tpo/employer). `approvalStatus` is the live source of truth,
  // so an admin approval unlocks the dashboard on the next login/refresh.
  if (user.role === "tpo" || user.role === "employer") {
    return approvalGatePath(user.role, user.approvalStatus);
  }

  if (user.role === "student") {
    switch (step) {
      case "complete":
        return "/dashboard";
      case "profile":
        return "/onboarding/profile";
      case "track_selection":
        return "/onboarding/tracks";
      case "pre_assessment":
        return "/onboarding/assessment";
      case "consent":
      default:
        // New students (no step yet) start onboarding at consent.
        return "/onboarding/consent";
    }
  }

  return landingPathForRole(user.role);
}
