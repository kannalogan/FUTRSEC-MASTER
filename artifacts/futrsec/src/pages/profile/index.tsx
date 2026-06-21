import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  User, Mail, Phone, MapPin, BookOpen, Briefcase, Link2, Github,
  FileText, Star, FlaskConical, Send, Edit3, Save, X, Award,
  Shield, TrendingUp, Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
  ai_security: "AI Security Engineer",
  cloud_security: "Cloud Security Architect",
  forensics: "Digital Forensics",
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<any>; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/60">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="h-4.5 w-4.5" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold font-heading text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["profile/me"],
    queryFn: () => apiFetch<any>("/api/profile/me"),
  });

  const data = rawData as any;

  // populate form when data loads
  if (rawData && !form.fullName && !form.college) {
    const d = rawData as any;
    setForm({
      fullName: d.user?.fullName ?? "",
      college: d.profile?.college ?? "",
      city: d.profile?.city ?? "",
      currentRole: d.profile?.currentRole ?? "",
      bio: d.profile?.bio ?? "",
      linkedinUrl: d.profile?.linkedinUrl ?? "",
      githubUrl: d.profile?.githubUrl ?? "",
      resumeUrl: d.profile?.resumeUrl ?? "",
      graduationYear: d.profile?.graduationYear?.toString() ?? "",
    });
  }

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiFetch("/api/profile/me", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile/me"] });
      setEditing(false);
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    const payload: Record<string, any> = { ...form };
    if (form.graduationYear) payload.graduationYear = parseInt(form.graduationYear, 10);
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-24" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const user = data?.user;
  const profile = data?.profile;
  const stats = data?.stats ?? {};
  const trackLabel = user?.track ? (TRACK_LABELS[user.track.slug] ?? user.track.name) : null;

  const profileFields = ["fullName", "college", "graduationYear", "city", "currentRole", "bio", "linkedinUrl"];
  const filled = profileFields.filter((f) => !!form[f]).length;
  const completion = Math.round((filled / profileFields.length) * 100);

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-5">
      {/* Header card */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">
                  {user?.fullName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold text-foreground">{user?.fullName ?? "Student"}</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {trackLabel && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">{trackLabel}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setEditing(false)}>
                    <X className="h-3.5 w-3.5" />Cancel
                  </Button>
                  <Button size="sm" className="h-8 gap-1" onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="h-3.5 w-3.5" />{updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setEditing(true)}>
                  <Edit3 className="h-3.5 w-3.5" />Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Profile completion */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">Profile Completion</span>
              <span className="text-xs font-bold text-foreground">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="FTS Score" value={Math.round(stats.ftsScore ?? 0)} icon={Star} color="#F59E0B" />
        <StatCard label="Labs Completed" value={stats.totalLabsCompleted ?? 0} icon={FlaskConical} color="#F97316" />
        <StatCard label="Lessons Done" value={stats.totalLessonsCompleted ?? 0} icon={BookOpen} color="#2563EB" />
        <StatCard label="Applications" value={stats.totalApplications ?? 0} icon={Send} color="#10B981" />
      </div>

      {/* FTS Breakdown */}
      <Card className="bg-card border-border/60">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />FTS Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {[
            { label: "Assessment", value: stats.assessmentScore ?? 0, color: "#2563EB" },
            { label: "Labs", value: stats.labScore ?? 0, color: "#F97316" },
            { label: "Assignments", value: stats.assignmentScore ?? 0, color: "#10B981" },
            { label: "Attendance", value: stats.attendanceScore ?? 0, color: "#8B5CF6" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium" style={{ color: item.color }}>{Math.round(item.value)}</span>
              </div>
              <Progress value={item.value} className="h-1.5" style={{ "--progress-color": item.color } as any} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="bg-card border-border/60">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editing ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
                  <Input className="h-8 text-sm" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">City</label>
                  <Input className="h-8 text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mumbai, Delhi..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">College / University</label>
                  <Input className="h-8 text-sm" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Graduation Year</label>
                  <Input className="h-8 text-sm" type="number" value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} placeholder="2025" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Current Role</label>
                  <Input className="h-8 text-sm" value={form.currentRole} onChange={(e) => setForm({ ...form, currentRole: e.target.value })} placeholder="Student / Fresher..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">LinkedIn URL</label>
                  <Input className="h-8 text-sm" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">GitHub URL</label>
                  <Input className="h-8 text-sm" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Resume URL</label>
                  <Input className="h-8 text-sm" value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })} placeholder="https://drive.google.com/..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Bio</label>
                  <Input className="h-8 text-sm" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
                </div>
              </>
            ) : (
              <>
                {[
                  { icon: User, label: "Full Name", value: user?.fullName },
                  { icon: Mail, label: "Email", value: user?.email },
                  { icon: MapPin, label: "City", value: profile?.city },
                  { icon: BookOpen, label: "College", value: profile?.college },
                  { icon: Briefcase, label: "Current Role", value: profile?.currentRole },
                  { icon: Award, label: "Graduation Year", value: profile?.graduationYear },
                ].map((f) => f.value ? (
                  <div key={f.label} className="flex items-center gap-2.5">
                    <f.icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium text-foreground">{f.value}</p>
                    </div>
                  </div>
                ) : null)}
                {profile?.bio && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm text-foreground/80">{profile.bio}</p>
                  </div>
                )}
                {(profile?.linkedinUrl || profile?.githubUrl || profile?.resumeUrl) && (
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    {profile?.linkedinUrl && (
                      <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Link2 className="h-3.5 w-3.5" />LinkedIn
                      </a>
                    )}
                    {profile?.githubUrl && (
                      <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Github className="h-3.5 w-3.5" />GitHub
                      </a>
                    )}
                    {profile?.resumeUrl && (
                      <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <FileText className="h-3.5 w-3.5" />Resume
                      </a>
                    )}
                  </div>
                )}
                {!profile && !user?.fullName && (
                  <div className="sm:col-span-2 text-center py-4">
                    <p className="text-sm text-muted-foreground">Complete your profile to increase visibility</p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setEditing(true)}>
                      Fill Profile
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
