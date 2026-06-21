import { useState } from "react";
import {
  useEmployerJobs, useCreateJob, useUpdateJob,
  TRACK_LABELS, TRACK_COLORS, TRACKS,
  type EmployerJob, type CreateJobBody,
} from "@/lib/employer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, MapPin, Globe } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  active: "#10B981",
  draft: "#64748B",
  closed: "#EF4444",
};

interface JobForm {
  title: string;
  description: string;
  type: string;
  location: string;
  isRemote: boolean;
  minSalary: string;
  maxSalary: string;
  experience: string;
  requiredTracks: string[];
  applicationDeadline: string;
  skills: string;
  status: string;
}

const EMPTY_FORM: JobForm = {
  title: "", description: "", type: "full_time", location: "", isRemote: false,
  minSalary: "", maxSalary: "", experience: "", requiredTracks: [],
  applicationDeadline: "", skills: "", status: "active",
};

function jobToForm(j: EmployerJob): JobForm {
  return {
    title: j.title,
    description: j.description,
    type: j.type,
    location: j.location ?? "",
    isRemote: j.isRemote,
    minSalary: j.minSalary != null ? String(j.minSalary) : "",
    maxSalary: j.maxSalary != null ? String(j.maxSalary) : "",
    experience: j.experience ?? "",
    requiredTracks: j.requiredTracks ?? [],
    applicationDeadline: j.applicationDeadline ? j.applicationDeadline.slice(0, 10) : "",
    skills: "",
    status: j.status,
  };
}

export default function EmployerJobsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useEmployerJobs();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<JobForm>(EMPTY_FORM);

  const jobs = data?.jobs ?? [];

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (j: EmployerJob) => {
    setEditId(j.id);
    setForm(jobToForm(j));
    setOpen(true);
  };

  const toggleTrack = (t: string) => {
    setForm((f) => ({
      ...f,
      requiredTracks: f.requiredTracks.includes(t)
        ? f.requiredTracks.filter((x) => x !== t)
        : [...f.requiredTracks, t],
    }));
  };

  const submit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" });
      return;
    }
    const body: CreateJobBody = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      location: form.location || undefined,
      isRemote: form.isRemote,
      minSalary: form.minSalary ? Number(form.minSalary) : null,
      maxSalary: form.maxSalary ? Number(form.maxSalary) : null,
      experience: form.experience || undefined,
      requiredTracks: form.requiredTracks,
      applicationDeadline: form.applicationDeadline || null,
      skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      status: form.status,
    };
    const onSuccess = () => {
      toast({ title: editId ? "Job updated" : "Job posted" });
      setOpen(false);
    };
    const onError = (e: Error) => toast({ title: e.message, variant: "destructive" });
    if (editId) {
      updateJob.mutate({ id: editId, body }, { onSuccess, onError });
    } else {
      createJob.mutate(body, { onSuccess, onError });
    }
  };

  const closeJob = (j: EmployerJob) => {
    updateJob.mutate(
      { id: j.id, body: { status: "closed" } },
      {
        onSuccess: () => toast({ title: "Job closed" }),
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  const saving = createJob.isPending || updateJob.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Briefcase}
        title="Jobs"
        subtitle="Post and manage your open roles."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Post Job</Button>}
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Post your first job to start receiving applications."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Post Job</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Tracks</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.title}</TableCell>
                    <TableCell className="text-muted-foreground">{j.type}</TableCell>
                    <TableCell>
                      <Badge
                        className="border-0 capitalize"
                        style={{ backgroundColor: `${STATUS_COLORS[j.status] ?? "#64748B"}20`, color: STATUS_COLORS[j.status] ?? "#64748B" }}
                      >
                        {j.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        {j.isRemote ? <><Globe className="h-3.5 w-3.5" /> Remote</> : <><MapPin className="h-3.5 w-3.5" /> {j.location ?? "—"}</>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(j.requiredTracks ?? []).map((t) => (
                          <Badge key={t} className="border-0 text-xs" style={{ backgroundColor: `${TRACK_COLORS[t]}20`, color: TRACK_COLORS[t] }}>
                            {TRACK_LABELS[t] ?? t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{j.applications}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {j.applicationDeadline ? format(new Date(j.applicationDeadline), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => openEdit(j)}>Edit</Button>
                      {j.status !== "closed" && (
                        <Button size="sm" variant="ghost" onClick={() => closeJob(j)} disabled={updateJob.isPending}>Close</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Job" : "Post Job"}</DialogTitle>
            <DialogDescription>Fill in the role details. Students matching your required tracks will see this job.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="j-title">Title</Label>
              <Input id="j-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="SOC Analyst (L1)" />
            </div>
            <div>
              <Label htmlFor="j-desc">Description</Label>
              <Textarea id="j-desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Role responsibilities, requirements…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="j-loc">Location</Label>
                <Input id="j-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bengaluru" />
              </div>
              <div>
                <Label htmlFor="j-exp">Experience</Label>
                <Input id="j-exp" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="0-2 years" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="j-remote"
                type="checkbox"
                checked={form.isRemote}
                onChange={(e) => setForm({ ...form, isRemote: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="j-remote">Remote</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="j-min">Min Salary</Label>
                <Input id="j-min" type="number" value={form.minSalary} onChange={(e) => setForm({ ...form, minSalary: e.target.value })} placeholder="500000" />
              </div>
              <div>
                <Label htmlFor="j-max">Max Salary</Label>
                <Input id="j-max" type="number" value={form.maxSalary} onChange={(e) => setForm({ ...form, maxSalary: e.target.value })} placeholder="800000" />
              </div>
            </div>
            <div>
              <Label>Required Tracks</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {TRACKS.map((t) => {
                  const active = form.requiredTracks.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTrack(t)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${active ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TRACK_COLORS[t] }} />
                        {TRACK_LABELS[t]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="j-deadline">Application Deadline</Label>
                <Input id="j-deadline" type="date" value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="j-skills">Skills (comma-separated)</Label>
                <Input id="j-skills" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="SIEM, Splunk, Python" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : editId ? "Save Changes" : "Post Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
