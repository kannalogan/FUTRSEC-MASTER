import { useState, useEffect } from "react";
import {
  useMentorSettings, useUpdateMentorSettings, TRACK_LABELS,
} from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon } from "lucide-react";

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
        onSuccess: () => toast({ title: "Settings saved" }),
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PageHeader icon={SettingsIcon} title="Settings" subtitle="Manage your mentor profile." />
        <CardSkeleton rows={8} />
      </div>
    );
  }

  const p = data.profile;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Manage your mentor profile and availability." />

      <Card className="mb-4">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-3">Account</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <div className="font-medium">{p.email ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Name</span>
              <div className="font-medium">{p.fullName ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Track</span>
              <div className="mt-0.5">
                {p.careerTrack ? <Badge variant="secondary">{TRACK_LABELS[p.careerTrack] ?? p.careerTrack}</Badge> : "—"}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Email, name and track are managed by an admin.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Profile</h3>
          <div>
            <Label htmlFor="s-spec">Specialization</Label>
            <Input id="s-spec" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Threat hunting, incident response…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-company">Company</Label>
              <Input id="s-company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-desig">Designation</Label>
              <Input id="s-desig" value={designation} onChange={(e) => setDesignation(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-linkedin">LinkedIn URL</Label>
              <Input id="s-linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/…" />
            </div>
            <div>
              <Label htmlFor="s-calendly">Calendly URL</Label>
              <Input id="s-calendly" value={calendlyUrl} onChange={(e) => setCalendlyUrl(e.target.value)} placeholder="https://calendly.com/…" />
            </div>
          </div>
          <div>
            <Label htmlFor="s-bio">Bio</Label>
            <Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Switch id="s-avail" checked={isAvailable} onCheckedChange={setIsAvailable} />
            <Label htmlFor="s-avail">Available for mentorship sessions</Label>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
