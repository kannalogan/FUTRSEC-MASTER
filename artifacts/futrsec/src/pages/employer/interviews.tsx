import { useState } from "react";
import {
  useEmployerInterviews, useUpdateInterview,
  type EmployerInterview,
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
import { CalendarCheck, Video } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#0EA5E9",
  completed: "#22C55E",
  cancelled: "#EF4444",
  no_show: "#F97316",
};
const STATUSES = ["scheduled", "completed", "cancelled", "no_show"];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function EmployerInterviewsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useEmployerInterviews();
  const updateInterview = useUpdateInterview();
  const interviews = data?.interviews ?? [];

  const [target, setTarget] = useState<EmployerInterview | null>(null);
  const [status, setStatus] = useState("scheduled");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [interviewerNotes, setInterviewerNotes] = useState("");

  const openEdit = (i: EmployerInterview) => {
    setTarget(i);
    setStatus(i.status);
    setScheduledAt(toLocalInput(i.scheduledAt));
    setMeetingUrl(i.meetingUrl ?? "");
    setFeedback(i.feedback ?? "");
    setInterviewerNotes(i.interviewerNotes ?? "");
  };

  const submit = () => {
    if (!target) return;
    updateInterview.mutate(
      {
        id: target.id,
        body: {
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          meetingUrl: meetingUrl || undefined,
          feedback: feedback || undefined,
          interviewerNotes: interviewerNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Interview updated" });
          setTarget(null);
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader icon={CalendarCheck} title="Interviews" subtitle="Track and update scheduled interviews." />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : interviews.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No interviews" description="Schedule interviews from the candidates page." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Meeting</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.student?.fullName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{i.student?.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>{i.job?.title ?? "—"}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{i.type}</TableCell>
                    <TableCell>
                      <Badge className="border-0 capitalize" style={{ backgroundColor: `${STATUS_COLORS[i.status] ?? "#64748B"}20`, color: STATUS_COLORS[i.status] ?? "#64748B" }}>
                        {i.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {i.scheduledAt ? format(new Date(i.scheduledAt), "dd MMM yyyy, HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      {i.meetingUrl ? (
                        <a href={i.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          <Video className="h-3.5 w-3.5" /> Join
                        </a>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(i)}>Update</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Interview</DialogTitle>
            <DialogDescription>
              {target?.student?.fullName ?? target?.student?.email} · {target?.job?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="iv-when">Scheduled At</Label>
              <Input id="iv-when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="iv-url">Meeting URL</Label>
              <Input id="iv-url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" />
            </div>
            <div>
              <Label htmlFor="iv-feedback">Feedback</Label>
              <Textarea id="iv-feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="iv-notes">Interviewer Notes</Label>
              <Textarea id="iv-notes" rows={3} value={interviewerNotes} onChange={(e) => setInterviewerNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={submit} disabled={updateInterview.isPending}>
              {updateInterview.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
