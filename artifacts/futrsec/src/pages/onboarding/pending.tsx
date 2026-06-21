import { useLocation, Redirect } from "wouter";
import { Shield, Clock, CheckCircle2, Circle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { landingPathForRole } from "@/lib/auth-routing";

export default function PendingApproval() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // Once an admin acts, a refresh re-fetches the live status and routes the
  // user off this review screen — to their dashboard or the rejected screen.
  if (user?.approvalStatus === "approved") return <Redirect to={landingPathForRole(user.role)} />;
  if (user?.approvalStatus === "rejected") return <Redirect to="/onboarding/rejected" />;

  const isEmployer = user?.role === "employer";
  const roleLabel = isEmployer ? "Employer" : "Training & Placement Officer";
  const description = isEmployer
    ? "Our team will verify your company details and contact information before granting access to the talent pool."
    : "Our team will verify your institutional affiliation and designation before granting you access to student placement data.";

  const steps = [
    { label: "Registration submitted", done: true },
    { label: "Email verified", done: true },
    { label: "Under admin review", done: false, active: true },
    { label: "Account approved", done: false },
    { label: "Access granted", done: false },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-heading font-bold text-xl tracking-tight">FUTRSEC</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>

          <h1 className="text-2xl font-heading font-bold mb-3">Application Under Review</h1>
          <p className="text-muted-foreground text-sm mb-2">
            Thank you for registering as a <span className="font-semibold text-foreground">{roleLabel}</span>.
          </p>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{description}</p>

          <div className="bg-muted/30 border border-border rounded-xl p-5 mb-8 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Application Progress</p>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  {s.done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : s.active ? (
                    <div className="h-5 w-5 rounded-full border-2 border-amber-500 bg-amber-100 shrink-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm ${s.done ? "text-foreground font-medium" : s.active ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {s.active && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">In Progress</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
            <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">We'll notify you by email</p>
              <p className="text-xs text-blue-700 mt-0.5">
                You'll receive an email at <span className="font-semibold">{user?.email}</span> once your account is approved. Review typically takes 1–2 business days.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            Questions? Contact us at{" "}
            <a href="mailto:futrsec@bcbuzz.io" className="text-primary hover:underline">
              futrsec@bcbuzz.io
            </a>
          </p>

          <Button variant="outline" onClick={handleLogout} className="w-full h-10">
            Sign Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
