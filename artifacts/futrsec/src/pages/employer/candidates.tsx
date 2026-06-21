import { useState } from "react";
import {
  useEmployerJobs, useJobCandidates, useUpdateApplication,
  useCreateInterview, useCreateOffer,
  TRACK_LABELS, TRACK_COLORS,
  type Candidate,
} from "@/lib/employer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Users, FileText, CalendarPlus, BadgePlus } from "lucide-react";
import { format } from "date-fns";

const APP_STATUS_COLORS: Record<string, string> = {
  applied: "#64748B",
  reviewing: "#0EA5E9",
  shortlisted: "#F97316",
  interviewing: "#06B6D4",
  offered: "#8B5CF6",
  hired: "#22C55E",
  rejected: "#EF4444",
};
const APP_STATUSES = ["applied", "reviewing", "shortlisted", "interviewing", "offered", "hired", "rejected"];

export default function EmployerCandidatesPage() {
  const { toast } = useToast();
  const { data: jobsData, isLoading: jobsLoading } = useEmployerJobs();
  const jobs = jobsData?.jobs ?? [];

  const [jobId, setJobId] = useState<number | null>(null);
  const { data: candData, isLoading: candLoading } = useJobCandidates(jobId);
  const candidates = candData?.candidates ?? [];

  const updateApp = useUpdateApplication();
  const createInterview = useCreateInterview();
  const createOffer = useCreateOffer();

  const [interviewFor, setInterviewFor] = useState<Candidate | null>(null);
  const [iType, setIType] = useState("technical");
  const [iScheduledAt, setIScheduledAt] = useState("");
  const [iMeetingUrl, setIMeetingUrl] = useState("");

  const [offerFor, setOfferFor] = useState<Candidate | null>(null);
  const [oSalary, setOSalary] = useState("");
  const [oJoiningDate, setOJoiningDate] = useState("");
  const [oOfferLetterUrl, setOOfferLetterUrl] = useState("");
  const [oExpiresAt, setOExpiresAt] = useState("");

  const setStatus = (c: Candidate, status: string) => {
    updateApp.mutate(
      { id: c.application.id, status },
      {
        onSuccess: () => toast({ title: `Marked ${status}` }),
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  const openInterview = (c: Candidate) => {
    setInterviewFor(c);
    setIType("technical");
    setIScheduledAt("");
    setIMeetingUrl("");
  };

  const submitInterview = () => {
    if (!interviewFor) return;
    createInterview.mutate(
      {
        applicationId: interviewFor.application.id,
        type: iType,
        scheduledAt: iScheduledAt ? new Date(iScheduledAt).toISOString() : null,
        meetingUrl: iMeetingUrl || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Interview scheduled" });
          setInterviewFor(null);
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  const openOffer = (c: Candidate) => {
    setOfferFor(c);
    setOSalary("");
    setOJoiningDate("");
    setOOfferLetterUrl("");
    setOExpiresAt("");
  };

  const submitOffer = () => {
    if (!offerFor) return;
    createOffer.mutate(
      {
        applicationId: offerFor.application.id,
        salary: oSalary ? Number(oSalary) : null,
        joiningDate: oJoiningDate || undefined,
        offerLetterUrl: oOfferLetterUrl || undefined,
        expiresAt: oExpiresAt ? new Date(oExpiresAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast({ title: "Offer created" });
          setOfferFor(null);
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader icon={Users} title="Candidates" subtitle="Review applicants, schedule interviews and make offers." />

      <div className="mb-6 max-w-md">
        <Label>Select a job</Label>
        <Select
          value={jobId != null ? String(jobId) : ""}
          onValueChange={(v) => setJobId(Number(v))}
          disabled={jobsLoading || jobs.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={jobsLoading ? "Loading jobs…" : jobs.length === 0 ? "No jobs available" : "Choose a job"} />
          </SelectTrigger>
          <SelectContent>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={String(j.id)}>
                {j.title} ({j.applications})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {jobId == null ? (
        <EmptyState icon={Users} title="No job selected" description="Pick a job above to view its candidates." />
      ) : candLoading ? (
        <CardSkeleton rows={6} />
      ) : candidates.length === 0 ? (
        <EmptyState icon={Users} title="No candidates yet" description="This job has not received any applications." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>FTS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Resume</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.application.id}>
                    <TableCell>
                      <div className="font-medium">{c.student?.fullName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.student?.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      {c.student?.careerTrack ? (
                        <Badge className="border-0" style={{ backgroundColor: `${TRACK_COLORS[c.student.careerTrack]}20`, color: TRACK_COLORS[c.student.careerTrack] }}>
                          {TRACK_LABELS[c.student.careerTrack] ?? c.student.careerTrack}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{c.ftsScore}</TableCell>
                    <TableCell>
                      <Badge className="border-0 capitalize" style={{ backgroundColor: `${APP_STATUS_COLORS[c.application.status] ?? "#64748B"}20`, color: APP_STATUS_COLORS[c.application.status] ?? "#64748B" }}>
                        {c.application.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.application.appliedAt ? format(new Date(c.application.appliedAt), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {c.application.resumeUrl ? (
                        <a href={c.application.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          <FileText className="h-3.5 w-3.5" /> View
                        </a>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select value={c.application.status} onValueChange={(v) => setStatus(c, v)}>
                          <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {APP_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => openInterview(c)} title="Schedule interview">
                          <CalendarPlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openOffer(c)} title="Make offer">
                          <BadgePlus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Schedule Interview Dialog */}
      <Dialog open={!!interviewFor} onOpenChange={(o) => { if (!o) setInterviewFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              For <strong>{interviewFor?.student?.fullName ?? interviewFor?.student?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select value={iType} onValueChange={setIType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="managerial">Managerial</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="i-when">Scheduled At</Label>
              <Input id="i-when" type="datetime-local" value={iScheduledAt} onChange={(e) => setIScheduledAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="i-url">Meeting URL</Label>
              <Input id="i-url" value={iMeetingUrl} onChange={(e) => setIMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInterviewFor(null)}>Cancel</Button>
            <Button onClick={submitInterview} disabled={createInterview.isPending}>
              {createInterview.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Make Offer Dialog */}
      <Dialog open={!!offerFor} onOpenChange={(o) => { if (!o) setOfferFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Offer</DialogTitle>
            <DialogDescription>
              For <strong>{offerFor?.student?.fullName ?? offerFor?.student?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="o-salary">Salary</Label>
              <Input id="o-salary" type="number" value={oSalary} onChange={(e) => setOSalary(e.target.value)} placeholder="700000" />
            </div>
            <div>
              <Label htmlFor="o-join">Joining Date</Label>
              <Input id="o-join" type="date" value={oJoiningDate} onChange={(e) => setOJoiningDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="o-letter">Offer Letter URL</Label>
              <Input id="o-letter" value={oOfferLetterUrl} onChange={(e) => setOOfferLetterUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="o-expires">Expires At</Label>
              <Input id="o-expires" type="datetime-local" value={oExpiresAt} onChange={(e) => setOExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOfferFor(null)}>Cancel</Button>
            <Button onClick={submitOffer} disabled={createOffer.isPending}>
              {createOffer.isPending ? "Creating…" : "Make Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
