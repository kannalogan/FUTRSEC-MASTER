import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { useUnreadNotificationCount } from "@/lib/notifications-api";
import { ThemeToggle } from "@/components/theme-toggle";
import { LayoutDashboard, BookOpen, GraduationCap, Calendar, Map, Bookmark, Users, Target, ClipboardList, SquareCheck as CheckSquare, ListTodo, FolderKanban, Briefcase, Navigation, FlaskConical, Cpu, Globe, Shield, Trophy, FileText, Laptop, Award, Building, Send, MessageSquare, ClipboardCheck, History, Gift, Library, User, FileSearch, Star, ChartBar as BarChart2, TreePine, Link2, Bot, Mic as Mic2, ScanSearch, BrainCircuit, Brain, TrendingUp, Languages, CreditCard, Receipt, Bell, Lock, Settings, Circle as HelpCircle, Headphones as HeadphonesIcon, ChevronDown, ChevronRight, LogOut, X, Gauge, Layers, ChartBar as BarChart3, TriangleAlert as AlertTriangle, Megaphone, ListChecks, UserCog, ShieldCheck, CalendarCheck, LifeBuoy, Ticket, HardDrive, Footprints } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Learning", href: "/learning", icon: BookOpen },
      { label: "My Courses", href: "/learning/courses", icon: GraduationCap },
      { label: "Calendar", href: "/calendar", icon: Calendar },
      { label: "Roadmap", href: "/roadmap", icon: Map },
      { label: "My Journey", href: "/student/journey", icon: Footprints },
      { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
      { label: "Community", href: "/community", icon: Users },
    ],
  },
  {
    title: "CAREER",
    items: [
      { label: "Career Track", href: "/career", icon: Target },
      { label: "Pre Assessment", href: "/onboarding/assessment", icon: ClipboardList },
      { label: "Checkpoints", href: "/checkpoints", icon: CheckSquare },
      { label: "Assignments", href: "/assignments", icon: ListTodo },
      { label: "Tasks", href: "/tasks", icon: FolderKanban },
      { label: "Projects", href: "/projects", icon: Briefcase },
      { label: "Career Roadmap", href: "/career-roadmap", icon: Navigation },
    ],
  },
  {
    title: "LABS",
    items: [
      { label: "My Labs", href: "/labs", icon: FlaskConical },
      { label: "CTF Challenges", href: "/labs/ctf", icon: Trophy },
      { label: "Sandbox", href: "/labs/sandbox", icon: Cpu },
      { label: "Virtual Machines", href: "/labs/vms", icon: Globe },
      { label: "Lab Reports", href: "/labs/reports", icon: FileText },
    ],
  },
  {
    title: "WORK",
    items: [
      { label: "Jobs", href: "/jobs", icon: Laptop },
      { label: "Applications", href: "/jobs/applications", icon: Send },
      { label: "Internships", href: "/jobs/internships", icon: Building },
      { label: "Certifications", href: "/certifications", icon: Award },
      { label: "Mock Interviews", href: "/ai/mock-interview", icon: MessageSquare },
      { label: "Assigned Interviews", href: "/interviews/assigned", icon: ClipboardList },
      { label: "Placement Interviews", href: "/interviews/placement", icon: CalendarCheck },
      { label: "Interview History", href: "/interviews/history", icon: History },
      { label: "Offer Tracker", href: "/jobs/offers", icon: Gift },
    ],
  },
  {
    title: "PROFILE",
    items: [
      { label: "Profile", href: "/profile", icon: User },
      { label: "Resume", href: "/profile/resume", icon: FileSearch },
      { label: "Achievements", href: "/achievements", icon: Star },
      { label: "Leaderboard", href: "/leaderboard", icon: BarChart2 },
      { label: "Skill Tree", href: "/skill-tree", icon: TreePine },
      { label: "Certificates", href: "/certificates", icon: Award },
      { label: "Social Links", href: "/profile/social", icon: Link2 },
    ],
  },
  {
    title: "AI & JOBS",
    items: [
      { label: "AI Explain Tutor", href: "/ai/tutor", icon: GraduationCap },
      { label: "AI Job Agent", href: "/ai/job-agent", icon: Bot },
      { label: "AI Career Coach", href: "/ai/career-coach", icon: Brain },
      { label: "Resume Analyzer", href: "/ai/resume-analyzer", icon: ScanSearch },
      { label: "Skill Gap Analyzer", href: "/ai/skill-gap", icon: BrainCircuit },
      { label: "AI Mock Interview", href: "/ai/mock-interview", icon: Mic2 },
      { label: "AI English Coach", href: "/ai/english-coach", icon: Languages },
      { label: "Placement Predictor", href: "/ai/placement-predictor", icon: TrendingUp },
    ],
  },
  {
    title: "PLACEMENT",
    items: [
      { label: "Job Agent", href: "/job-agent", icon: Bot },
      { label: "Placement", href: "/placement", icon: Award },
      { label: "Campus Drives", href: "/campus/student", icon: Building },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Subscription", href: "/subscription", icon: CreditCard },
      { label: "Payments", href: "/payments", icon: Receipt },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "DPDP Consent", href: "/privacy", icon: Shield },
      { label: "Privacy", href: "/privacy", icon: Lock },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Help Center", href: "/help", icon: HelpCircle },
      { label: "Support", href: "/support", icon: HeadphonesIcon },
    ],
  },
];

const MENTOR_NAV: NavSection[] = [
  {
    title: "MENTOR",
    items: [
      { label: "Overview", href: "/mentor/overview", icon: Gauge },
      { label: "Assigned Students", href: "/mentor/students", icon: Users },
      { label: "Assigned Batches", href: "/mentor/batches", icon: Layers },
      { label: "Cohort Analytics", href: "/mentor/analytics", icon: BarChart3 },
      { label: "At-Risk Students", href: "/mentor/at-risk", icon: AlertTriangle },
      { label: "Broadcast Notes", href: "/mentor/broadcasts", icon: Megaphone },
      { label: "Task Builder", href: "/mentor/tasks", icon: ListChecks },
      { label: "Journey Builder", href: "/mentor/journeys", icon: Footprints },
      { label: "Question Bank", href: "/mentor/question-bank", icon: Library },
      { label: "Mock Interviews", href: "/mentor/mock-interviews", icon: Mic2 },
      { label: "Lab Builder", href: "/mentor/lab-builder", icon: FlaskConical },
      { label: "Audit Logs", href: "/mentor/audit-logs", icon: History },
      { label: "Reports", href: "/mentor/reports", icon: FileText },
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/mentor/settings", icon: Settings },
    ],
  },
];

const TPO_NAV: NavSection[] = [
  {
    title: "TPO",
    items: [
      { label: "Overview", href: "/tpo/dashboard", icon: Gauge },
      { label: "Placement Drives", href: "/tpo/drives", icon: CalendarCheck },
      { label: "Student Analytics", href: "/tpo/analytics", icon: BarChart3 },
      { label: "Placements", href: "/tpo/placements", icon: Briefcase },
      { label: "Student Directory", href: "/tpo/directory", icon: Users },
      { label: "Reports", href: "/tpo/reports", icon: FileText },
      { label: "Campus Drives", href: "/campus/tpo", icon: Building },
      { label: "Events", href: "/tpo/events", icon: Calendar },
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/tpo/settings", icon: Settings },
    ],
  },
];

const EMPLOYER_NAV: NavSection[] = [
  {
    title: "EMPLOYER",
    items: [
      { label: "Overview", href: "/employer/dashboard", icon: Gauge },
      { label: "Job Postings", href: "/employer/jobs", icon: Briefcase },
      { label: "Candidates", href: "/employer/candidates", icon: Users },
      { label: "Interviews", href: "/employer/interviews", icon: MessageSquare },
      { label: "Offers", href: "/employer/offers", icon: Gift },
      { label: "Hiring Analytics", href: "/employer/analytics", icon: BarChart3 },
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/employer/settings", icon: Settings },
    ],
  },
];

// Admin sees ONLY these menus — exactly the 22 platform-admin destinations,
// grouped for scannability. No student/mentor/tpo/employer items ever render here.
const ADMIN_NAV: NavSection[] = [
  {
    title: "PLATFORM",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Consent Logs", href: "/admin/consent-logs", icon: Shield },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { label: "Students", href: "/admin/students", icon: Users },
      { label: "Mentors", href: "/admin/mentors", icon: UserCog },
      { label: "TPO Management", href: "/admin/tpos", icon: GraduationCap },
      { label: "Company Management", href: "/admin/companies", icon: Building },
    ],
  },
  {
    title: "LEARNING",
    items: [
      { label: "Tracks", href: "/admin/tracks", icon: Layers },
      { label: "Journeys", href: "/admin/journeys", icon: Footprints },
      { label: "Courses", href: "/admin/courses", icon: BookOpen },
      { label: "Labs", href: "/admin/labs", icon: FlaskConical },
      { label: "Assessments", href: "/admin/assessments", icon: ClipboardCheck },
      { label: "Question Bank", href: "/admin/question-bank", icon: Library },
      { label: "Certificates", href: "/admin/certificates", icon: Award },
    ],
  },
  {
    title: "CAREER",
    items: [
      { label: "Job Postings", href: "/admin/job-postings", icon: Briefcase },
      { label: "Placements", href: "/admin/placements", icon: Award },
      { label: "Campus Drives", href: "/campus/admin", icon: Building },
    ],
  },
  {
    title: "BILLING",
    items: [
      { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      { label: "Payments", href: "/admin/payments", icon: Receipt },
      { label: "Coupons", href: "/admin/coupons", icon: Gift },
    ],
  },
  {
    title: "AI",
    items: [
      { label: "AI Config", href: "/admin/ai-config", icon: BrainCircuit },
      { label: "AI Usage", href: "/admin/ai-usage", icon: Bot },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Support Tickets", href: "/admin/support", icon: Ticket },
      { label: "File Storage", href: "/admin/storage", icon: HardDrive },
      { label: "Data Retention", href: "/admin/retention", icon: ShieldCheck },
      { label: "Platform Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export type Role = "admin" | "mentor" | "tpo" | "employer" | "student";

export function navForRole(role: string | null | undefined): NavSection[] {
  switch (role) {
    case "admin": return ADMIN_NAV;
    case "mentor": return MENTOR_NAV;
    case "tpo": return TPO_NAV;
    case "employer": return EMPLOYER_NAV;
    default: return NAV_SECTIONS; // student (and null) only
  }
}

// Compact primary destinations for the mobile bottom bar (max 5 per role).
export function primaryNavForRole(role: string | null | undefined): NavItem[] {
  switch (role) {
    case "admin":
      return [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Students", href: "/admin/students", icon: Users },
        { label: "Courses", href: "/admin/courses", icon: BookOpen },
        { label: "Billing", href: "/admin/payments", icon: Receipt },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ];
    case "mentor":
      return [
        { label: "Overview", href: "/mentor/overview", icon: Gauge },
        { label: "Students", href: "/mentor/students", icon: Users },
        { label: "Batches", href: "/mentor/batches", icon: Layers },
        { label: "At-Risk", href: "/mentor/at-risk", icon: AlertTriangle },
        { label: "Reports", href: "/mentor/reports", icon: FileText },
      ];
    case "tpo":
      return [
        { label: "Overview", href: "/tpo/dashboard", icon: Gauge },
        { label: "Placements", href: "/tpo/placements", icon: Briefcase },
        { label: "Students", href: "/tpo/directory", icon: Users },
        { label: "Drives", href: "/campus/tpo", icon: Building },
        { label: "Reports", href: "/tpo/reports", icon: FileText },
      ];
    case "employer":
      return [
        { label: "Overview", href: "/employer/dashboard", icon: Gauge },
        { label: "Jobs", href: "/employer/jobs", icon: Briefcase },
        { label: "Candidates", href: "/employer/candidates", icon: Users },
        { label: "Offers", href: "/employer/offers", icon: Gift },
        { label: "Settings", href: "/employer/settings", icon: Settings },
      ];
    default:
      return [
        { label: "Home", href: "/dashboard", icon: LayoutDashboard },
        { label: "Learn", href: "/learning", icon: BookOpen },
        { label: "Labs", href: "/labs", icon: FlaskConical },
        { label: "Jobs", href: "/jobs", icon: Laptop },
        { label: "Profile", href: "/profile", icon: User },
      ];
  }
}

const TRACK_COLORS: Record<string, string> = {
  soc: "#3B82F6",
  vapt: "#F97316",
  grc: "#10B981",
  ai_security: "#8B5CF6",
  cloud_security: "#06B6D4",
  forensics: "#EF4444",
};

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
  ai_security: "AI Security",
  cloud_security: "Cloud Security",
  forensics: "Digital Forensics",
};

function NavLink({ item }: { item: NavItem }) {
  const [location] = useLocation();
  const isActive = location === item.href;

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-menu transition-colors duration-150 ease-out group ${
        isActive
          ? "bg-primary/8 text-sidebar-foreground"
          : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
      )}
      <item.icon className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${isActive ? "text-primary" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60"}`} />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto text-badge bg-primary text-white px-1.5 py-0.5 rounded shadow-sm">{item.badge}</span>
      )}
    </Link>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout: localLogout } = useAuth();
  const logoutMutation = useLogout();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { data: unreadCount } = useUnreadNotificationCount();

  const role = user?.role ?? null;
  const isStudent = !role || role === "student";

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => localLogout() });
  };

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // The career track is permanent (chosen once at onboarding) and is the single
  // source of truth for what a student can access. Only students see it.
  const trackSlug = user?.careerTrack ?? null;
  const trackColor = trackSlug ? (TRACK_COLORS[trackSlug] ?? "#3B82F6") : "#3B82F6";
  const trackLabel = trackSlug ? (TRACK_LABELS[trackSlug] ?? trackSlug) : "No Track";

  // Locked "Explore" cards for the other tracks — visible but not accessible.
  // Students only; no other role sees track concepts.
  const lockedTracks = isStudent
    ? (["soc", "vapt", "grc"] as const).filter((t) => t !== trackSlug)
    : [];

  const sections = navForRole(role);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet/5" />

      {/* Logo */}
      <div className="relative flex items-center justify-between px-5 h-14 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center shadow-sm ring-1 ring-primary/20">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-heading font-bold text-base tracking-tight text-sidebar-foreground">FUTRSEC</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1 rounded-md hover:bg-sidebar-accent/50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Track Badge — students only */}
      {isStudent && trackSlug && (
        <div className="relative px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/40 px-3 py-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: trackColor }} />
            <span className="text-caption font-medium text-sidebar-foreground/80 truncate">{trackLabel}</span>
            <span className="ml-auto text-badge uppercase text-sidebar-foreground/40 shrink-0">Active</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
        {sections.map((section) => {
          const isCollapsed = collapsed[section.title];
          return (
            <div key={section.title} className="mb-1.5">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sidebar-section text-sidebar-foreground/30 hover:text-sidebar-foreground/50 transition-colors"
              >
                {section.title}
                {isCollapsed ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              </button>
              {!isCollapsed && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const withBadge =
                      item.href === "/notifications" && unreadCount && unreadCount > 0
                        ? { ...item, badge: unreadCount > 99 ? "99+" : String(unreadCount) }
                        : item;
                    return <NavLink key={item.href + item.label} item={withBadge} />;
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Explore other tracks — students only, locked/view-only */}
        {isStudent && trackSlug && lockedTracks.length > 0 && (
          <div className="mb-2 mt-3">
            <div className="px-3 py-2 text-sidebar-section text-sidebar-foreground/40">Explore</div>
            <div className="space-y-1">
              {lockedTracks.map((t) => (
                <div
                  key={t}
                  title="Locked — your career track is fixed. Contact an admin to change tracks."
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-menu text-sidebar-foreground/35 cursor-not-allowed select-none"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: TRACK_COLORS[t] ?? "#3B82F6" }}
                  />
                  <span className="truncate">{TRACK_LABELS[t] ?? t}</span>
                  <Lock className="h-[18px] w-[18px] ml-auto shrink-0 text-sidebar-foreground/35" />
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="relative px-3 py-3 border-t border-sidebar-border shrink-0 space-y-2">
        <ThemeToggle />
        <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/30 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-violet/20 flex items-center justify-center shrink-0 border border-border">
            <span className="text-caption font-semibold text-sidebar-foreground">
              {user?.fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-caption font-medium text-sidebar-foreground truncate">
              {user?.fullName ?? user?.email ?? "Student"}
            </p>
            <p className="text-badge text-sidebar-foreground/40 truncate capitalize">{role ?? "student"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
