import { useLocation, Redirect } from "wouter";
import { Shield, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { landingPathForRole } from "@/lib/auth-routing";

export default function ApplicationRejected() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // If the decision was reversed to approved, send them to their dashboard.
  if (user?.approvalStatus === "approved") return <Redirect to={landingPathForRole(user.role)} />;
  if (user?.approvalStatus === "pending") return <Redirect to="/onboarding/pending" />;

  const isEmployer = user?.role === "employer";
  const roleLabel = isEmployer ? "Employer" : "Training & Placement Officer";

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
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-heading font-bold mb-3">Application Not Approved</h1>
          <p className="text-muted-foreground text-sm mb-2">
            Thank you for your interest in joining FUTRSEC as a{" "}
            <span className="font-semibold text-foreground">{roleLabel}</span>.
          </p>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            After review, our team was unable to approve your account at this time. This usually
            happens when we could not verify the details provided during registration.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
            <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Think this is a mistake?</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Reach out to our team and we'll be happy to take another look at your application.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            Contact us at{" "}
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
