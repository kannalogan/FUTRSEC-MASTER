import { useGetPlatformStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Shield, Users, BookOpen, Briefcase, ChevronRight, Lock, FlaskConical, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const DOMAINS = [
  {
    title: "SOC Analyst",
    accent: "primary",
    desc: "Master incident response, SIEM tooling, and threat hunting in real enterprise environments.",
  },
  {
    title: "VAPT",
    accent: "amber",
    desc: "Offensive security, penetration testing, and vulnerability assessment methodologies end to end.",
  },
  {
    title: "GRC",
    accent: "emerald",
    desc: "Governance, risk, and compliance. Operationalize frameworks like ISO 27001, NIST, and SOC 2.",
  },
] as const;

const ACCENT: Record<string, { chip: string; bar: string; glow: string }> = {
  primary: { chip: "bg-primary/12 text-primary ring-primary/20", bar: "bg-primary", glow: "group-hover:shadow-[0_0_30px_-8px_var(--color-primary-500)]" },
  amber: { chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-amber-500/20", bar: "bg-amber-500", glow: "group-hover:shadow-[0_0_30px_-8px_var(--color-amber-500)]" },
  emerald: { chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20", bar: "bg-emerald-500", glow: "group-hover:shadow-[0_0_30px_-8px_var(--color-emerald-500)]" },
};

export default function Home() {
  const { data: stats, isLoading } = useGetPlatformStats();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-1/4 -right-40 h-[32rem] w-[32rem] rounded-full bg-violet/10 blur-[140px]" />
      </div>

      {/* Nav */}
      <header className="fixed top-0 w-full h-16 bg-background/70 backdrop-blur-xl border-b border-border/70 z-50 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center glow-primary">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight">FUTRSEC</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Link href="/login">
            <Button variant="outline" className="font-medium">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="pt-36 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-caption font-semibold border border-primary/20">
            <Lock className="h-3.5 w-3.5" />
            The Cybersecurity Ecosystem
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight leading-[1.05]">
            India's next generation of{" "}
            <span className="bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">security professionals.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            A precise, serious, and technically credible platform where you master SOC, VAPT, GRC, and Cloud Security — from guided labs all the way to placement.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base">
                Start Learning <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Create Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-28 grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatCard icon={Users} label="Active Students" value={isLoading ? "—" : stats?.totalStudents?.toLocaleString() || "10,000+"} />
          <StatCard icon={BookOpen} label="Learning Tracks" value={isLoading ? "—" : stats?.totalTracks?.toString() || "6"} />
          <StatCard icon={FlaskConical} label="Virtual Labs" value={isLoading ? "—" : stats?.totalLabs?.toString() || "250+"} />
          <StatCard icon={Briefcase} label="Placements" value={isLoading ? "—" : stats?.totalJobs?.toString() || "1,200+"} />
        </div>

        {/* Domain Showcase */}
        <div className="mt-28">
          <h2 className="text-3xl font-heading font-bold tracking-tight mb-3">Specialized Domains</h2>
          <p className="text-body-lg text-muted-foreground mb-10 max-w-2xl">
            Pick a track and follow a personalized journey from beginner to job-ready, calibrated to your level.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {DOMAINS.map((d) => (
              <DomainCard key={d.title} {...d} />
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-28 relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-violet/5 to-transparent p-10 md:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-[90px]" />
          <div className="relative max-w-xl">
            <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">Ready to build a career in security?</h2>
            <p className="text-body-lg text-muted-foreground mt-3">
              Join thousands of learners training for SOC, VAPT, GRC, and Cloud Security roles across India.
            </p>
            <Link href="/login">
              <Button size="lg" className="mt-7 h-12 px-8 text-base">
                Get Started <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/70 px-6 md:px-12 py-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-caption text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>© {new Date().getFullYear()} FUTRSEC. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <a href="mailto:futrsec@bcbuzz.io" className="hover:text-foreground transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="hover-lift group p-6 rounded-2xl border border-border/70 bg-card text-card-foreground elevation-1 flex flex-col gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/12 ring-1 ring-primary/20 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="text-3xl font-bold font-heading num-tabular mt-1">{value}</div>
      <div className="text-caption text-muted-foreground font-medium">{label}</div>
    </div>
  );
}

function DomainCard({ title, accent, desc }: { title: string; accent: string; desc: string }) {
  const a = ACCENT[accent] ?? ACCENT.primary;
  return (
    <div className={`hover-lift group relative overflow-hidden p-8 rounded-2xl border border-border/70 bg-card elevation-1 transition-shadow ${a.glow}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${a.bar}`} />
      <div className="relative z-10">
        <h3 className={`inline-flex px-3 py-1 rounded-lg text-badge font-bold mb-4 ring-1 ${a.chip}`}>
          {title}
        </h3>
        <p className="text-body text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
