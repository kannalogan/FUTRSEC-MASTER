import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import RegisterIndex from "@/pages/register/index";
import RegisterStudent from "@/pages/register/student";
import RegisterTPO from "@/pages/register/tpo";
import RegisterEmployer from "@/pages/register/employer";
import VerifyOTP from "@/pages/auth/verify";
import ForgotPassword from "@/pages/auth/forgot-password";
import Consent from "@/pages/onboarding/consent";
import Profile from "@/pages/onboarding/profile";
import Tracks from "@/pages/onboarding/tracks";
import Assessment from "@/pages/onboarding/assessment";
import Complete from "@/pages/onboarding/complete";
import PendingApproval from "@/pages/onboarding/pending";

import DashboardHome from "@/pages/dashboard/index";
import LearningPage from "@/pages/learning/index";
import MyCoursesPage from "@/pages/learning/my-courses";
import LessonPlayerPage from "@/pages/learning/lesson";
import CalendarPage from "@/pages/calendar/index";
import RoadmapPage from "@/pages/roadmap/index";
import BookmarksPage from "@/pages/bookmarks/index";
import CommunityPage from "@/pages/community/index";
import CareerTrackPage from "@/pages/career/index";
import CareerRoadmapPage from "@/pages/career-roadmap/index";
import CheckpointsPage from "@/pages/checkpoints/index";
import AssignmentsPage from "@/pages/assignments/index";
import TasksPage from "@/pages/tasks/index";
import ProjectsPage from "@/pages/projects/index";
import LabsPage from "@/pages/labs/index";
import CTFPage from "@/pages/labs/ctf";
import SandboxPage from "@/pages/labs/sandbox";
import VMsPage from "@/pages/labs/vms";
import LabReportsPage from "@/pages/labs/reports";
import LabWorkspacePage from "@/pages/labs/workspace";
import JobsPage from "@/pages/jobs/index";
import ApplicationsPage from "@/pages/jobs/applications";
import InternshipsPage from "@/pages/jobs/internships";
import OffersPage from "@/pages/jobs/offers";
import CertificationsPage from "@/pages/certifications/index";
import InterviewHistoryPage from "@/pages/interviews/history";
import ProfilePage from "@/pages/profile/index";
import PrivacyCenter from "@/pages/privacy/index";
import AIExplainTutor from "@/pages/ai/tutor";
import AICareerCoach from "@/pages/ai/career-coach";
import ResumeAnalyzer from "@/pages/ai/resume-analyzer";
import SkillGapAnalyzer from "@/pages/ai/skill-gap";
import AIMockInterview from "@/pages/ai/mock-interview";
import AIJobAgent from "@/pages/ai/job-agent";
import AIEnglishCoach from "@/pages/ai/english-coach";
import PlacementPredictor from "@/pages/ai/placement-predictor";
import ResumePage from "@/pages/profile/resume";
import SocialLinksPage from "@/pages/profile/social";
import AchievementsPage from "@/pages/achievements/index";
import LeaderboardPage from "@/pages/leaderboard/index";
import SkillTreePage from "@/pages/skill-tree/index";
import CertificatesPage from "@/pages/certificates/index";
import SubscriptionPage from "@/pages/subscription/index";
import PaymentsPage from "@/pages/payments/index";
import NotificationsPage from "@/pages/notifications/index";
import SettingsPage from "@/pages/settings/index";
import HelpPage from "@/pages/help/index";
import SupportPage from "@/pages/support/index";
import AdminStudentsPage from "@/pages/admin/students";
import Forbidden from "@/pages/forbidden";

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

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!token) return <Redirect to="/login" />;
  if (user?.role !== "admin") return <Layout><Forbidden /></Layout>;
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
      <Route path="/register" component={RegisterIndex} />
      <Route path="/register/student" component={RegisterStudent} />
      <Route path="/register/tpo" component={RegisterTPO} />
      <Route path="/register/employer" component={RegisterEmployer} />
      <Route path="/auth/verify" component={VerifyOTP} />
      <Route path="/auth/forgot-password" component={ForgotPassword} />

      {/* Onboarding */}
      <Route path="/onboarding/consent"><OnboardingRoute component={Consent} /></Route>
      <Route path="/onboarding/profile"><OnboardingRoute component={Profile} /></Route>
      <Route path="/onboarding/tracks"><OnboardingRoute component={Tracks} /></Route>
      <Route path="/onboarding/assessment"><OnboardingRoute component={Assessment} /></Route>
      <Route path="/onboarding/complete"><OnboardingRoute component={Complete} /></Route>
      <Route path="/onboarding/pending"><OnboardingRoute component={PendingApproval} /></Route>

      {/* Dashboard */}
      <Route path="/dashboard"><ProtectedRoute component={DashboardHome} /></Route>

      {/* Learning */}
      <Route path="/learning"><ProtectedRoute component={LearningPage} /></Route>
      <Route path="/learning/courses"><ProtectedRoute component={MyCoursesPage} /></Route>
      <Route path="/my-courses"><ProtectedRoute component={MyCoursesPage} /></Route>
      <Route path="/learning/:moduleId/:lessonId"><ProtectedRoute component={LessonPlayerPage} /></Route>
      <Route path="/calendar"><ProtectedRoute component={CalendarPage} /></Route>
      <Route path="/roadmap"><ProtectedRoute component={RoadmapPage} /></Route>
      <Route path="/bookmarks"><ProtectedRoute component={BookmarksPage} /></Route>
      <Route path="/community"><ProtectedRoute component={CommunityPage} /></Route>

      {/* Career & Tasks */}
      <Route path="/career"><ProtectedRoute component={CareerTrackPage} /></Route>
      <Route path="/career-roadmap"><ProtectedRoute component={CareerRoadmapPage} /></Route>
      <Route path="/checkpoints"><ProtectedRoute component={CheckpointsPage} /></Route>
      <Route path="/assignments"><ProtectedRoute component={AssignmentsPage} /></Route>
      <Route path="/tasks"><ProtectedRoute component={TasksPage} /></Route>
      <Route path="/projects"><ProtectedRoute component={ProjectsPage} /></Route>

      {/* Labs */}
      <Route path="/labs"><ProtectedRoute component={LabsPage} /></Route>
      <Route path="/labs/ctf"><ProtectedRoute component={CTFPage} /></Route>
      <Route path="/labs/sandbox"><ProtectedRoute component={SandboxPage} /></Route>
      <Route path="/labs/vms"><ProtectedRoute component={VMsPage} /></Route>
      <Route path="/labs/reports"><ProtectedRoute component={LabReportsPage} /></Route>
      <Route path="/labs/:labId"><ProtectedRoute component={LabWorkspacePage} /></Route>

      {/* Jobs */}
      <Route path="/jobs"><ProtectedRoute component={JobsPage} /></Route>
      <Route path="/jobs/applications"><ProtectedRoute component={ApplicationsPage} /></Route>
      <Route path="/jobs/internships"><ProtectedRoute component={InternshipsPage} /></Route>
      <Route path="/jobs/offers"><ProtectedRoute component={OffersPage} /></Route>
      <Route path="/certifications"><ProtectedRoute component={CertificationsPage} /></Route>
      <Route path="/interviews/history"><ProtectedRoute component={InterviewHistoryPage} /></Route>

      {/* Profile */}
      <Route path="/profile"><ProtectedRoute component={ProfilePage} /></Route>
      <Route path="/profile/resume"><ProtectedRoute component={ResumePage} /></Route>
      <Route path="/profile/social"><ProtectedRoute component={SocialLinksPage} /></Route>

      {/* Gamification */}
      <Route path="/achievements"><ProtectedRoute component={AchievementsPage} /></Route>
      <Route path="/leaderboard"><ProtectedRoute component={LeaderboardPage} /></Route>
      <Route path="/skill-tree"><ProtectedRoute component={SkillTreePage} /></Route>
      <Route path="/certificates"><ProtectedRoute component={CertificatesPage} /></Route>

      {/* AI */}
      <Route path="/ai/tutor"><ProtectedRoute component={AIExplainTutor} /></Route>
      <Route path="/ai/career-coach"><ProtectedRoute component={AICareerCoach} /></Route>
      <Route path="/ai/resume-analyzer"><ProtectedRoute component={ResumeAnalyzer} /></Route>
      <Route path="/ai/skill-gap"><ProtectedRoute component={SkillGapAnalyzer} /></Route>
      <Route path="/ai/mock-interview"><ProtectedRoute component={AIMockInterview} /></Route>
      <Route path="/ai/job-agent"><ProtectedRoute component={AIJobAgent} /></Route>
      <Route path="/ai/english-coach"><ProtectedRoute component={AIEnglishCoach} /></Route>
      <Route path="/ai/placement-predictor"><ProtectedRoute component={PlacementPredictor} /></Route>

      {/* Account */}
      <Route path="/subscription"><ProtectedRoute component={SubscriptionPage} /></Route>
      <Route path="/payments"><ProtectedRoute component={PaymentsPage} /></Route>
      <Route path="/notifications"><ProtectedRoute component={NotificationsPage} /></Route>
      <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
      <Route path="/help"><ProtectedRoute component={HelpPage} /></Route>
      <Route path="/support"><ProtectedRoute component={SupportPage} /></Route>

      {/* Privacy / DPDP */}
      <Route path="/privacy"><ProtectedRoute component={PrivacyCenter} /></Route>

      {/* Admin */}
      <Route path="/admin/students"><AdminRoute component={AdminStudentsPage} /></Route>

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
