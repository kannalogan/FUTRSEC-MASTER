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

// Where to send a user immediately after a successful login. Students may still
// be mid-onboarding; all other roles go straight to their role landing page.
export function postLoginPath(user: {
  role?: string | null;
  onboardingStep?: string | null;
}): string {
  const step = user.onboardingStep ?? undefined;

  // Approval gate applies to roles created pending admin approval (e.g. tpo/employer).
  if (step === "pending_approval") return "/onboarding/pending";

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
