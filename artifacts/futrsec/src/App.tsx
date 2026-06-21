import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider, ThemeSync } from "@/hooks/use-theme";
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
import AdminMentorsPage from "@/pages/admin/mentors";
import MentorOverview from "@/pages/mentor/overview";
import MentorStudentsPage from "@/pages/mentor/students";
import MentorBatchesPage from "@/pages/mentor/batches";
import MentorAnalyticsPage from "@/pages/mentor/analytics";
import MentorAtRiskPage from "@/pages/mentor/at-risk";
import MentorBroadcastsPage from "@/pages/mentor/broadcasts";
import MentorTasksPage from "@/pages/mentor/tasks";
import MentorAuditLogsPage from "@/pages/mentor/audit-logs";
import MentorReportsPage from "@/pages/mentor/reports";
import MentorSettingsPage from "@/pages/mentor/settings";

import TpoOverviewPage from "@/pages/tpo/overview";
import TpoAnalyticsPage from "@/pages/tpo/analytics";
import TpoPlacementsPage from "@/pages/tpo/placements";
import TpoDirectoryPage from "@/pages/tpo/directory";
import TpoReportsPage from "@/pages/tpo/reports";
import TpoEventsPage from "@/pages/tpo/events";
import TpoSettingsPage from "@/pages/tpo/settings";

import EmployerOverviewPage from "@/pages/employer/overview";
import EmployerJobsPage from "@/pages/employer/jobs";
import EmployerCandidatesPage from "@/pages/employer/candidates";
import EmployerInterviewsPage from "@/pages/employer/interviews";
import EmployerOffersPage from "@/pages/employer/offers";
import EmployerAnalyticsPage from "@/pages/employer/analytics";
import EmployerSettingsPage from "@/pages/employer/settings";

import AdminOverviewPage from "@/pages/admin/overview";
import AdminTposPage from "@/pages/admin/tpos";
import AdminCompaniesPage from "@/pages/admin/companies";
import AdminJobsPage from "@/pages/admin/jobs";
import AdminApplicationsPage from "@/pages/admin/applications";
import AdminPlacementsPage from "@/pages/admin/placements";
import AdminSubscriptionsPage from "@/pages/admin/subscriptions";
import AdminPaymentsPage from "@/pages/admin/payments";
import AdminAiUsagePage from "@/pages/admin/ai-usage";
import AdminConsentLogsPage from "@/pages/admin/consent-logs";
import AdminAuditLogsPage from "@/pages/admin/audit-logs";
import AdminCouponsPage from "@/pages/admin/coupons";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminTracksPage from "@/pages/admin/tracks";
import AdminCoursesPage from "@/pages/admin/courses";
import AdminLabsPage from "@/pages/admin/labs";
import AdminAssessmentsPage from "@/pages/admin/assessments";
import AdminCertificatesPage from "@/pages/admin/certificates";
import AdminJobPostingsPage from "@/pages/admin/job-postings";
import AdminAiConfigPage from "@/pages/admin/ai-config";
import AdminSettingsPage from "@/pages/admin/settings";
import VerifyCertificatePage from "@/pages/verify";

import JobAgentPage from "@/pages/job-agent/index";
import JobAgentAutoApplyPage from "@/pages/job-agent/auto-apply";
import PlacementPage from "@/pages/placement/index";
import AnalyticsPage from "@/pages/analytics/index";
import CampusStudentPage from "@/pages/campus/student";
import CampusAdminPage from "@/pages/campus/admin";
import CampusTpoPage from "@/pages/campus/tpo";

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

function MentorRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!token) return <Redirect to="/login" />;
  if (user?.role !== "mentor") return <Layout><Forbidden /></Layout>;
  return <Layout><Component /></Layout>;
}

function TpoRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!token) return <Redirect to="/login" />;
  if (user?.role !== "tpo") return <Layout><Forbidden /></Layout>;
  return <Layout><Component /></Layout>;
}

function EmployerRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!token) return <Redirect to="/login" />;
  if (user?.role !== "employer") return <Layout><Forbidden /></Layout>;
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
      <Route path="/verify/:token" component={VerifyCertificatePage} />

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

      {/* Placement (Part 5) */}
      <Route path="/job-agent"><ProtectedRoute component={JobAgentPage} /></Route>
      <Route path="/job-agent/auto-apply"><ProtectedRoute component={JobAgentAutoApplyPage} /></Route>
      <Route path="/placement"><ProtectedRoute component={PlacementPage} /></Route>
      <Route path="/analytics"><ProtectedRoute component={AnalyticsPage} /></Route>
      <Route path="/campus/student"><ProtectedRoute component={CampusStudentPage} /></Route>

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
      <Route path="/admin"><AdminRoute component={AdminOverviewPage} /></Route>
      <Route path="/admin/dashboard"><AdminRoute component={AdminDashboardPage} /></Route>
      <Route path="/admin/students"><AdminRoute component={AdminStudentsPage} /></Route>
      <Route path="/admin/tracks"><AdminRoute component={AdminTracksPage} /></Route>
      <Route path="/admin/courses"><AdminRoute component={AdminCoursesPage} /></Route>
      <Route path="/admin/labs"><AdminRoute component={AdminLabsPage} /></Route>
      <Route path="/admin/assessments"><AdminRoute component={AdminAssessmentsPage} /></Route>
      <Route path="/admin/certificates"><AdminRoute component={AdminCertificatesPage} /></Route>
      <Route path="/admin/job-postings"><AdminRoute component={AdminJobPostingsPage} /></Route>
      <Route path="/admin/ai-config"><AdminRoute component={AdminAiConfigPage} /></Route>
      <Route path="/admin/settings"><AdminRoute component={AdminSettingsPage} /></Route>
      <Route path="/admin/mentors"><AdminRoute component={AdminMentorsPage} /></Route>
      <Route path="/admin/tpos"><AdminRoute component={AdminTposPage} /></Route>
      <Route path="/admin/companies"><AdminRoute component={AdminCompaniesPage} /></Route>
      <Route path="/admin/jobs"><AdminRoute component={AdminJobsPage} /></Route>
      <Route path="/admin/applications"><AdminRoute component={AdminApplicationsPage} /></Route>
      <Route path="/admin/placements"><AdminRoute component={AdminPlacementsPage} /></Route>
      <Route path="/admin/subscriptions"><AdminRoute component={AdminSubscriptionsPage} /></Route>
      <Route path="/admin/payments"><AdminRoute component={AdminPaymentsPage} /></Route>
      <Route path="/admin/ai-usage"><AdminRoute component={AdminAiUsagePage} /></Route>
      <Route path="/admin/consent-logs"><AdminRoute component={AdminConsentLogsPage} /></Route>
      <Route path="/admin/audit-logs"><AdminRoute component={AdminAuditLogsPage} /></Route>
      <Route path="/admin/coupons"><AdminRoute component={AdminCouponsPage} /></Route>
      <Route path="/admin/analytics"><AdminRoute component={AdminAnalyticsPage} /></Route>
      <Route path="/campus/admin"><AdminRoute component={CampusAdminPage} /></Route>

      {/* TPO */}
      <Route path="/tpo"><TpoRoute component={TpoOverviewPage} /></Route>
      <Route path="/tpo/analytics"><TpoRoute component={TpoAnalyticsPage} /></Route>
      <Route path="/tpo/placements"><TpoRoute component={TpoPlacementsPage} /></Route>
      <Route path="/tpo/directory"><TpoRoute component={TpoDirectoryPage} /></Route>
      <Route path="/tpo/reports"><TpoRoute component={TpoReportsPage} /></Route>
      <Route path="/tpo/events"><TpoRoute component={TpoEventsPage} /></Route>
      <Route path="/tpo/settings"><TpoRoute component={TpoSettingsPage} /></Route>
      <Route path="/campus/tpo"><TpoRoute component={CampusTpoPage} /></Route>

      {/* Employer */}
      <Route path="/employer"><EmployerRoute component={EmployerOverviewPage} /></Route>
      <Route path="/employer/jobs"><EmployerRoute component={EmployerJobsPage} /></Route>
      <Route path="/employer/candidates"><EmployerRoute component={EmployerCandidatesPage} /></Route>
      <Route path="/employer/interviews"><EmployerRoute component={EmployerInterviewsPage} /></Route>
      <Route path="/employer/offers"><EmployerRoute component={EmployerOffersPage} /></Route>
      <Route path="/employer/analytics"><EmployerRoute component={EmployerAnalyticsPage} /></Route>
      <Route path="/employer/settings"><EmployerRoute component={EmployerSettingsPage} /></Route>

      {/* Mentor */}
      <Route path="/mentor"><MentorRoute component={MentorOverview} /></Route>
      <Route path="/mentor/students"><MentorRoute component={MentorStudentsPage} /></Route>
      <Route path="/mentor/batches"><MentorRoute component={MentorBatchesPage} /></Route>
      <Route path="/mentor/analytics"><MentorRoute component={MentorAnalyticsPage} /></Route>
      <Route path="/mentor/at-risk"><MentorRoute component={MentorAtRiskPage} /></Route>
      <Route path="/mentor/broadcasts"><MentorRoute component={MentorBroadcastsPage} /></Route>
      <Route path="/mentor/tasks"><MentorRoute component={MentorTasksPage} /></Route>
      <Route path="/mentor/audit-logs"><MentorRoute component={MentorAuditLogsPage} /></Route>
      <Route path="/mentor/reports"><MentorRoute component={MentorReportsPage} /></Route>
      <Route path="/mentor/settings"><MentorRoute component={MentorSettingsPage} /></Route>

      {/* Catch-all */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <ThemeSync />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
