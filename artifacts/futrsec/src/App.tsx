import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Consent from "@/pages/onboarding/consent";
import Profile from "@/pages/onboarding/profile";
import Tracks from "@/pages/onboarding/tracks";
import Assessment from "@/pages/onboarding/assessment";
import Complete from "@/pages/onboarding/complete";

import DashboardHome from "@/pages/dashboard/index";
import LearningPage from "@/pages/learning/index";
import LabsPage from "@/pages/labs/index";
import JobsPage from "@/pages/jobs/index";
import ProfilePage from "@/pages/profile/index";
import PrivacyCenter from "@/pages/privacy/index";
import AICareerCoach from "@/pages/ai/career-coach";
import ResumeAnalyzer from "@/pages/ai/resume-analyzer";
import SkillGapAnalyzer from "@/pages/ai/skill-gap";
import AIMockInterview from "@/pages/ai/mock-interview";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!token) return <Redirect to="/login" />;
  return <Layout><Component /></Layout>;
}

function OnboardingRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />

      {/* Onboarding */}
      <Route path="/onboarding/consent"><OnboardingRoute component={Consent} /></Route>
      <Route path="/onboarding/profile"><OnboardingRoute component={Profile} /></Route>
      <Route path="/onboarding/tracks"><OnboardingRoute component={Tracks} /></Route>
      <Route path="/onboarding/assessment"><OnboardingRoute component={Assessment} /></Route>
      <Route path="/onboarding/complete"><OnboardingRoute component={Complete} /></Route>

      {/* Dashboard */}
      <Route path="/dashboard"><ProtectedRoute component={DashboardHome} /></Route>

      {/* Learning */}
      <Route path="/learning"><ProtectedRoute component={LearningPage} /></Route>
      <Route path="/learning/courses"><ProtectedRoute component={LearningPage} /></Route>

      {/* Labs */}
      <Route path="/labs"><ProtectedRoute component={LabsPage} /></Route>

      {/* Jobs */}
      <Route path="/jobs"><ProtectedRoute component={JobsPage} /></Route>
      <Route path="/jobs/applications"><ProtectedRoute component={JobsPage} /></Route>
      <Route path="/jobs/internships"><ProtectedRoute component={JobsPage} /></Route>

      {/* Profile */}
      <Route path="/profile"><ProtectedRoute component={ProfilePage} /></Route>
      <Route path="/profile/resume"><ProtectedRoute component={ProfilePage} /></Route>
      <Route path="/profile/social"><ProtectedRoute component={ProfilePage} /></Route>

      {/* AI */}
      <Route path="/ai/career-coach"><ProtectedRoute component={AICareerCoach} /></Route>
      <Route path="/ai/resume-analyzer"><ProtectedRoute component={ResumeAnalyzer} /></Route>
      <Route path="/ai/skill-gap"><ProtectedRoute component={SkillGapAnalyzer} /></Route>
      <Route path="/ai/mock-interview"><ProtectedRoute component={AIMockInterview} /></Route>

      {/* Privacy / DPDP */}
      <Route path="/privacy"><ProtectedRoute component={PrivacyCenter} /></Route>

      {/* Catch-all */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
