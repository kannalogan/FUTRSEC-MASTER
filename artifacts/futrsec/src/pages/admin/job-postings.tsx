import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, Send, Archive } from "lucide-react";

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst",
  vapt: "VAPT Professional",
  grc: "GRC Specialist",
};
const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB",
  vapt: "#F97316",
  grc: "#10B981",
};
const TRACKS = ["soc", "vapt", "grc"] as const;
type Track = (typeof TRACKS)[number];

type JobType = "full_time" | "internship";
type JobStatus = "active" | "draft" | "closed";

interface JobPosting {
  id: number;
  employerId: number | null;
  createdByAdminId: number | null;
  title: string;
  description: string;
  type: JobType;
  location: string | null;
  isRemote: boolean | null;
  minSalary: number | null;
  maxSalary: number | null;
  experience: string | null;
  requiredTracks: Track[];
  status: JobStatus;
  applicationDeadline: string | null;
}

interface JobsResponse {
  jobs: JobPosting[];
}

interface FormState {
  title: string;
  description: string;
  type: JobType;
  location: string;
  isRemote: boolean;
  minSalary: string;
  maxSalary: string;
  experience: string;
  requiredTracks: Track[];
  applicationDeadline: string;
  status: JobStatus;
}

function emptyForm(type: JobType): FormState {
  return {
    title: "",
    description: "",
    type,
    location: "",
    isRemote: false,
    minSalary: "",
    maxSalary: "",
    experience: "",
    requiredTracks: [],
    applicationDeadline: "",
    status: "draft",
  };
}

const STATUS_VARIANT: Record<JobStatus, "secondary" | "outline" | "destructive"> = {
  active: "secondary",
  draft: "outline",
  closed: "destructive",
};

export default function AdminJobPostingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<JobType>("full_time");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm("full_time"));

  const queryKey = ["/api/admin/job-postings", tab];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiFetch<JobsResponse>(`/api/admin/job-postings?type=${tab}`),
  });

  const jobs = data?.jobs ?? [];

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/job-postings"] });
  };

  const buildBody = () => ({
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    location: form.location.trim() || undefined,
    isRemote: form.isRemote,
    minSalary: form.minSalary ? Number(form.minSalary) : undefined,
    maxSalary: form.maxSalary ? Number(form.maxSalary) : undefined,
    experience: form.experience.trim() || undefined,
    requiredTracks: form.requiredTracks,
    applicationDeadline: form.applicationDeadline
      ? new Date(form.applicationDeadline).toISOString()
      : undefined,
    status: form.status,
  });

  const createMut = useMutation({
    mutationFn: (vars: ReturnType<typeof buildBody>) =>
      apiFetch("/api/admin/job-postings", { method: "POST", body: JSON.stringify(vars) }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Job posting created" });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; body: ReturnType<typeof buildBody> }) =>
      apiFetch(`/api/admin/job-postings/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.body),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Job posting updated" });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const publishMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/job-postings/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Job published" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/job-postings/${id}/archive`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Job archived" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm(tab));
    setDialogOpen(true);
  };

  const openEdit = (j: JobPosting) => {
    setEditId(j.id);
    setForm({
      title: j.title,
      description: j.description,
      type: j.type,
      location: j.location ?? "",
      isRemote: !!j.isRemote,
      minSalary: j.minSalary != null ? String(j.minSalary) : "",
      maxSalary: j.maxSalary != null ? String(j.maxSalary) : "",
      experience: j.experience ?? "",
      requiredTracks: j.requiredTracks ?? [],
      applicationDeadline: j.applicationDeadline
        ? j.applicationDeadline.slice(0, 10)
        : "",
      status: j.status,
    });
    setDialogOpen(true);
  };

  const toggleTrack = (t: Track) =>
    setForm((f) => ({
      ...f,
      requiredTracks: f.requiredTracks.includes(t)
        ? f.requiredTracks.filter((x) => x !== t)
        : [...f.requiredTracks, t],
    }));

  const save = () => {
    if (form.title.trim().length < 2) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (form.description.trim().length < 1) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    if (form.requiredTracks.length === 0) {
      toast({ title: "Select at least one required track", variant: "destructive" });
      return;
    }
    const body = buildBody();
    if (editId != null) {
      updateMut.mutate({ id: editId, body });
    } else {
      createMut.mutate(body);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  const noun = tab === "internship" ? "Internship" : "Job";

  return (
    <div>
      <PageHeader
        icon={Briefcase}
        title="Job & Internship CMS"
        subtitle="Create and manage platform-authored jobs and internships."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New {noun}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as JobType)} className="mb-6">
        <TabsList>
          <TabsTrigger value="full_time">Jobs</TabsTrigger>
          <TabsTrigger value="internship">Internships</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={`No ${noun.toLowerCase()}s yet`}
          description={`Create your first ${noun.toLowerCase()} to publish it to students.`}
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> New {noun}</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required Tracks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.title}</TableCell>
                    <TableCell className="capitalize">{j.type.replace("_", " ")}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(j.requiredTracks ?? []).length === 0 ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : (
                          j.requiredTracks.map((t) => (
                            <Badge
                              key={t}
                              className="border-0"
                              style={{ backgroundColor: `${TRACK_COLORS[t] ?? "#64748B"}20`, color: TRACK_COLORS[t] ?? "#64748B" }}
                            >
                              {TRACK_LABELS[t] ?? t}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[j.status]} className="capitalize">{j.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.isRemote ? "Remote" : j.location ?? "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(j)}>Edit</Button>
                        {j.status !== "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => publishMut.mutate(j.id)}
                            disabled={publishMut.isPending}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" /> Publish
                          </Button>
                        )}
                        {j.status !== "closed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => archiveMut.mutate(j.id)}
                            disabled={archiveMut.isPending}
                          >
                            <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId != null ? `Edit ${noun}` : `New ${noun}`}</DialogTitle>
            <DialogDescription>
              Platform-authored {noun.toLowerCase()} visible to students whose track matches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="j-title">Title</Label>
              <Input id="j-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="SOC Analyst Intern" />
            </div>
            <div>
              <Label htmlFor="j-desc">Description</Label>
              <Textarea id="j-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="j-loc">Location</Label>
                <Input id="j-loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Bengaluru" />
              </div>
              <div>
                <Label htmlFor="j-exp">Experience</Label>
                <Input id="j-exp" value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="0-2 years" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="j-remote" checked={form.isRemote} onCheckedChange={(v) => set("isRemote", v)} />
              <Label htmlFor="j-remote">Remote</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="j-min">Min Salary (₹)</Label>
                <Input id="j-min" type="number" min={0} value={form.minSalary} onChange={(e) => set("minSalary", e.target.value)} placeholder="300000" />
              </div>
              <div>
                <Label htmlFor="j-max">Max Salary (₹)</Label>
                <Input id="j-max" type="number" min={0} value={form.maxSalary} onChange={(e) => set("maxSalary", e.target.value)} placeholder="600000" />
              </div>
            </div>
            <div>
              <Label htmlFor="j-deadline">Application Deadline</Label>
              <Input id="j-deadline" type="date" value={form.applicationDeadline} onChange={(e) => set("applicationDeadline", e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Required Tracks</Label>
              <div className="space-y-2">
                {TRACKS.map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <Checkbox
                      id={`track-${t}`}
                      checked={form.requiredTracks.includes(t)}
                      onCheckedChange={() => toggleTrack(t)}
                    />
                    <Label htmlFor={`track-${t}`} className="flex items-center gap-2 font-normal cursor-pointer">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TRACK_COLORS[t] }} />
                      {TRACK_LABELS[t]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editId != null ? "Save Changes" : `Create ${noun}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
