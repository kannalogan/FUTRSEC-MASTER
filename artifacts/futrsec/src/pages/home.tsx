import { useGetPlatformStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Shield, Users, BookOpen, Briefcase, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: stats, isLoading } = useGetPlatformStats();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Nav */}
      <header className="fixed top-0 w-full h-16 bg-background/80 backdrop-blur-md border-b z-50 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight">
          <Shield className="h-6 w-6 text-primary" />
          FUTRSEC
        </div>
        <div>
          <Link href="/login">
            <Button variant="outline" className="font-medium">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <Lock className="h-4 w-4" />
            The Cybersecurity Ecosystem
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight text-foreground leading-[1.1]">
            India's next generation of security professionals.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            A precise, serious, and technically credible platform where users master SOC, VAPT, GRC, and Cloud Security. From guided labs to placement.
          </p>
          <div className="pt-4 flex gap-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base">
                Start Learning <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Active Students" value={isLoading ? "..." : stats?.totalStudents?.toLocaleString() || "10,000+"} />
          <StatCard icon={BookOpen} label="Learning Tracks" value={isLoading ? "..." : stats?.totalTracks?.toString() || "6"} />
          <StatCard icon={Shield} label="Virtual Labs" value={isLoading ? "..." : stats?.totalLabs?.toString() || "250+"} />
          <StatCard icon={Briefcase} label="Placements" value={isLoading ? "..." : stats?.totalJobs?.toString() || "1,200+"} />
        </div>
        
        {/* Domain Showcase */}
        <div className="mt-32">
          <h2 className="text-3xl font-heading font-bold mb-10">Specialized Domains</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <DomainCard title="SOC Analyst" color="bg-blue-500/10 text-blue-600 border-blue-500/20" desc="Master incident response, SIEM tools, and threat hunting in enterprise environments." />
            <DomainCard title="VAPT" color="bg-orange-500/10 text-orange-600 border-orange-500/20" desc="Offensive security, penetration testing, and vulnerability assessment methodologies." />
            <DomainCard title="GRC" color="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" desc="Governance, risk, and compliance. Master frameworks like ISO 27001 and NIST." />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col gap-2">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <div className="text-3xl font-bold font-heading mt-2">{value}</div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </div>
  );
}

function DomainCard({ title, color, desc }: { title: string, color: string, desc: string }) {
  return (
    <div className={`p-8 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}>
      <div className="relative z-10">
        <h3 className={`inline-block px-3 py-1 rounded-md text-sm font-bold mb-4 ${color}`}>
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
