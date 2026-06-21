import { useState, useEffect } from "react";
import {
  useMentorSettings, useUpdateMentorSettings, TRACK_LABELS, TRACK_COLORS
} from "@/lib/mentor-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Shield, Linkedin, Calendar, Briefcase, Mail, User, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function MentorSettingsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useMentorSettings();
  const updateMut = useUpdateMentorSettings();

  const [specialization, setSpecialization] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [bio, setBio] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const p = data?.profile;
    if (p) {
      setSpecialization(p.specialization ?? "");
      setCompany(p.company ?? "");
      setDesignation(p.designation ?? "");
      setLinkedinUrl(p.linkedinUrl ?? "");
      setCalendlyUrl(p.calendlyUrl ?? "");
      setBio(p.bio ?? "");
      setIsAvailable(p.isAvailable);
    }
  }, [data]);

  const save = () => {
    updateMut.mutate(
      {
        specialization: specialization || null,
        company: company || null,
        designation: designation || null,
        linkedinUrl: linkedinUrl || null,
        calendlyUrl: calendlyUrl || null,
        bio: bio || null,
        isAvailable,
      },
      {
        onSuccess: () => toast({ title: "Configuration deployed successfully" }),
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading || !data) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <PageHeader icon={SettingsIcon} title="Profile & Preferences" subtitle="Manage your mentor profile parameters." />
        <CardSkeleton rows={12} />
      </div>
    );
  }

  const p = data.profile;
  const trackColor = p.careerTrack ? (TRACK_COLORS[p.careerTrack] ?? "#3B82F6") : "#3B82F6";

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader 
          icon={SettingsIcon} 
          title="Profile Configuration" 
          subtitle="Define your professional identity and session availability rules." 
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div className="md:col-span-1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="glass-card border-border/60 overflow-hidden sticky top-6">
            <div className="h-2 w-full" style={{ backgroundColor: trackColor }} />
            <CardContent className="p-6 pt-8 text-center flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center mb-4 ring-4 ring-background shadow-xl">
                <span className="text-3xl font-bold font-heading">{p.fullName?.[0]?.toUpperCase() ?? p.email?.[0]?.toUpperCase() ?? "U"}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground font-heading">{p.fullName ?? "Unknown Mentor"}</h2>
              <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5 justify-center">
                <ShieldCheck className="h-4 w-4 text-primary" /> Active Mentor
              </p>
              
              <div className="w-full mt-8 space-y-4 text-left border-t border-border/50 pt-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate" title={p.email ?? ""}>{p.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  {p.careerTrack ? (
                    <Badge variant="outline" style={{ borderColor: `${trackColor}50`, color: trackColor, backgroundColor: `${trackColor}10` }} className="text-xs uppercase tracking-wider py-0.5 px-2 font-semibold">
                      {TRACK_LABELS[p.careerTrack] ?? p.careerTrack}
                    </Badge>
                  ) : <span className="text-sm font-medium text-muted-foreground">—</span>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-8 text-center opacity-70">
                Identity parameters are locked and governed by platform administrators.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="md:col-span-2 space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="glass-card border-border/60">
            <CardHeader className="p-6 pb-2 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Professional Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="s-spec" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Core Specialization</Label>
                <Input id="s-spec" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. Offensive Security, Compliance Audits..." className="h-11 text-base bg-background/50" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="s-company" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Organization</Label>
                  <Input id="s-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Current employer" className="h-11 bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-desig" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title / Role</Label>
                  <Input id="s-desig" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Current title" className="h-11 bg-background/50" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="s-bio" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive Bio</Label>
                <Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={5} className="resize-none bg-background/50 leading-relaxed text-base" placeholder="Describe your background and what students can learn from you..." />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/60">
            <CardHeader className="p-6 pb-2 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Networking & Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="s-linkedin" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" /> LinkedIn Protocol</Label>
                  <Input id="s-linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className="h-11 bg-background/50 font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-calendly" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Scheduling Endpoint</Label>
                  <Input id="s-calendly" value={calendlyUrl} onChange={(e) => setCalendlyUrl(e.target.value)} placeholder="https://calendly.com/..." className="h-11 bg-background/50 font-mono text-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="s-avail" className="text-base font-bold text-foreground cursor-pointer">Routing Status</Label>
                  <p className="text-sm text-muted-foreground">Accept new 1:1 mentorship requests from cohort</p>
                </div>
                <Switch id="s-avail" checked={isAvailable} onCheckedChange={setIsAvailable} className="data-[state=checked]:bg-primary" />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={save} disabled={updateMut.isPending} size="lg" className="rounded-full px-8 font-bold shadow-md">
                  {updateMut.isPending ? "Deploying..." : "Deploy Configuration"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Target(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}
