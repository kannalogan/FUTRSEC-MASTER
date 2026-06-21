import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { useUnreadNotificationCount } from "@/lib/notifications-api";
import {
  LayoutDashboard, BookOpen, GraduationCap, Calendar, Map, Bookmark, Users,
  Target, ClipboardList, CheckSquare, ListTodo, FolderKanban, Briefcase, Navigation,
  FlaskConical, Cpu, Globe, Shield, Trophy, FileText,
  Laptop, Award, Building, Send, MessageSquare, ClipboardCheck, History, Gift,
  User, FileSearch, Star, BarChart2, TreePine, Link2,
  Bot, Mic2, ScanSearch, BrainCircuit, Brain, TrendingUp, Languages,
  CreditCard, Receipt, Bell, Lock, Settings, HelpCircle, HeadphonesIcon,
  ChevronDown, ChevronRight, LogOut, Menu, X, ExternalLink,
  Gauge, Layers, BarChart3, AlertTriangle, Megaphone, ListChecks, UserCog
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  locked?: boolean;
};

type NavSection = {
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
      { label: "Overview", href: "/mentor", icon: Gauge },
      { label: "Assigned Students", href: "/mentor/students", icon: Users },
      { label: "Assigned Batches", href: "/mentor/batches", icon: Layers },
      { label: "Cohort Analytics", href: "/mentor/analytics", icon: BarChart3 },
      { label: "At-Risk Students", href: "/mentor/at-risk", icon: AlertTriangle },
      { label: "Broadcast Notes", href: "/mentor/broadcasts", icon: Megaphone },
      { label: "Task Builder", href: "/mentor/tasks", icon: ListChecks },
      { label: "Audit Logs", href: "/mentor/audit-logs", icon: History },
      { label: "Reports", href: "/mentor/reports", icon: FileText },
      { label: "Settings", href: "/mentor/settings", icon: Settings },
    ],
  },
];

const TPO_NAV: NavSection[] = [
  {
    title: "TPO",
    items: [
      { label: "Overview", href: "/tpo", icon: Gauge },
      { label: "Student Analytics", href: "/tpo/analytics", icon: BarChart3 },
      { label: "Placements", href: "/tpo/placements", icon: Briefcase },
      { label: "Student Directory", href: "/tpo/directory", icon: Users },
      { label: "Reports", href: "/tpo/reports", icon: FileText },
      { label: "Campus Drives", href: "/campus/tpo", icon: Building },
      { label: "Events", href: "/tpo/events", icon: Calendar },
      { label: "Settings", href: "/tpo/settings", icon: Settings },
    ],
  },
];

const EMPLOYER_NAV: NavSection[] = [
  {
    title: "EMPLOYER",
    items: [
      { label: "Overview", href: "/employer", icon: Gauge },
      { label: "Job Postings", href: "/employer/jobs", icon: Briefcase },
      { label: "Candidates", href: "/employer/candidates", icon: Users },
      { label: "Interviews", href: "/employer/interviews", icon: MessageSquare },
      { label: "Offers", href: "/employer/offers", icon: Gift },
      { label: "Hiring Analytics", href: "/employer/analytics", icon: BarChart3 },
      { label: "Settings", href: "/employer/settings", icon: Settings },
    ],
  },
];

const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB",
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
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all duration-150 group relative ${
        isActive
          ? "bg-sidebar-accent text-white font-medium"
          : "text-white/50 hover:text-white/90 hover:bg-white/5"
      }`}
    >
      <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-white" : "text-white/40 group-hover:text-white/70"}`} />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto text-[10px] font-medium bg-primary text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
      )}
    </Link>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout: localLogout } = useAuth();
  const logoutMutation = useLogout();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { data: unreadCount } = useUnreadNotificationCount();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => localLogout() });
  };

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // The career track is permanent (chosen once at onboarding) and is the single
  // source of truth for what this student can access. There is intentionally NO
  // track-switching UI here — only an admin can change a track.
  const trackSlug = user?.careerTrack ?? null;
  const trackColor = trackSlug ? (TRACK_COLORS[trackSlug] ?? "#2563EB") : "#2563EB";
  const trackLabel = trackSlug ? (TRACK_LABELS[trackSlug] ?? trackSlug) : "No Track";

  // Locked "Explore" cards for the other tracks — visible but not accessible.
  const lockedTracks = (["soc", "vapt", "grc"] as const).filter((t) => t !== trackSlug);

  return (
    <div className="flex flex-col h-full bg-[#08111F] text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-heading font-bold text-[15px] tracking-tight text-white">FUTRSEC</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Track Badge */}
      {trackSlug && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: trackColor }} />
            <span className="text-xs font-medium text-white/80 truncate">{trackLabel}</span>
            <span className="ml-auto text-[10px] text-white/40 shrink-0">Active</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
        {(user?.role === "mentor"
          ? MENTOR_NAV
          : user?.role === "tpo"
            ? TPO_NAV
            : user?.role === "employer"
              ? EMPLOYER_NAV
              : NAV_SECTIONS
        ).map((section) => {
          const isCollapsed = collapsed[section.title];
          return (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold tracking-widest text-white/30 hover:text-white/50 transition-colors uppercase"
              >
                {section.title}
                {isCollapsed ? <ChevronRight className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5">
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

        {/* Admin-only */}
        {user?.role === "admin" && (
          <div className="mb-1 mt-2">
            <div className="px-3 py-1.5 text-[10px] font-semibold tracking-widest text-white/30 uppercase">
              Admin
            </div>
            <div className="space-y-0.5">
              <NavLink item={{ label: "Overview", href: "/admin", icon: Gauge }} />
              <NavLink item={{ label: "Student Management", href: "/admin/students", icon: Users }} />
              <NavLink item={{ label: "Mentor Management", href: "/admin/mentors", icon: UserCog }} />
              <NavLink item={{ label: "TPO Management", href: "/admin/tpos", icon: GraduationCap }} />
              <NavLink item={{ label: "Company Management", href: "/admin/companies", icon: Building }} />
              <NavLink item={{ label: "Jobs", href: "/admin/jobs", icon: Briefcase }} />
              <NavLink item={{ label: "Applications", href: "/admin/applications", icon: Send }} />
              <NavLink item={{ label: "Placements", href: "/admin/placements", icon: Award }} />
              <NavLink item={{ label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard }} />
              <NavLink item={{ label: "Payments", href: "/admin/payments", icon: Receipt }} />
              <NavLink item={{ label: "AI Usage", href: "/admin/ai-usage", icon: Bot }} />
              <NavLink item={{ label: "Campus Drives", href: "/campus/admin", icon: Building }} />
              <NavLink item={{ label: "Coupons", href: "/admin/coupons", icon: Gift }} />
              <NavLink item={{ label: "Analytics", href: "/admin/analytics", icon: BarChart3 }} />
              <NavLink item={{ label: "Consent Logs", href: "/admin/consent-logs", icon: Shield }} />
              <NavLink item={{ label: "Audit Logs", href: "/admin/audit-logs", icon: History }} />
            </div>
          </div>
        )}

        {/* Explore other tracks — locked, view-only */}
        {user?.role !== "mentor" && trackSlug && lockedTracks.length > 0 && (
          <div className="mb-1 mt-2">
            <div className="px-3 py-1.5 text-[10px] font-semibold tracking-widest text-white/30 uppercase">
              Explore
            </div>
            <div className="space-y-0.5">
              {lockedTracks.map((t) => (
                <div
                  key={t}
                  title="Locked — your career track is fixed. Contact an admin to change tracks."
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-white/30 cursor-not-allowed select-none"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: TRACK_COLORS[t] ?? "#2563EB" }}
                  />
                  <span className="truncate">{TRACK_LABELS[t] ?? t}</span>
                  <Lock className="h-3 w-3 ml-auto shrink-0 text-white/30" />
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {user?.fullName ?? user?.email ?? "Student"}
            </p>
            <p className="text-[10px] text-white/40 truncate">{user?.role ?? "student"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
