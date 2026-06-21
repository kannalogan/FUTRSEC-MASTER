import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Users, Download, Eye, Ban, CheckCircle2, Award, FlaskConical,
  Gauge, Target,
} from "lucide-react";

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
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Student {
  id: number;
  email: string | null;
  fullName: string | null;
  careerTrack: string | null;
  selectedTrackId?: number | null;
  onboardingStep?: string | null;
  isActive: boolean;
  createdAt?: string;
}

interface StudentListResponse {
  students: Student[];
}

interface StudentDetail {
  student: {
    id: number;
    email: string | null;
    fullName: string | null;
    phone: string | null;
    careerTrack: string | null;
    selectedTrackId: number | null;
    onboardingStep: string | null;
    isActive: boolean;
    avatarUrl: string | null;
    createdAt: string;
  };
  profile: Record<string, unknown> | null;
  ftsScores: { totalScore?: number | null } | null;
  checkpoints: {
    id: number;
    title: string | null;
    order: number | null;
    requiredScore: number | null;
    status: string;
    score: number | null;
    completedAt: string | null;
  }[];
  completedLabs: { labId: number; title: string | null; slug: string | null }[];
  certificates: { id: number; title?: string | null; issuedAt?: string | null }[];
}

function TrackBadge({ track }: { track: string | null }) {
  if (!track) return <span className="text-muted-foreground text-sm">Not set</span>;
  const color = TRACK_COLORS[track];
  return (
    <Badge
      style={{ backgroundColor: `${color}20`, color }}
      className="border-0"
    >
      {TRACK_LABELS[track] ?? track}
    </Badge>
  );
}

function StudentDetailDialog({
  studentId, onClose,
}: {
  studentId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/admin/students/${studentId}/detail`],
    queryFn: () => apiFetch<StudentDetail>(`/api/admin/students/${studentId}/detail`),
    enabled: studentId != null,
  });

  return (
    <Dialog open={studentId != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
          <DialogDescription>
            Full profile snapshot, FTS score, checkpoints, labs and certificates.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-4"><CardSkeleton rows={6} /></div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Profile */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-base">{data.student.fullName ?? "—"}</h3>
                  <p className="text-sm text-muted-foreground">{data.student.email ?? "—"}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <TrackBadge track={data.student.careerTrack} />
                  <Badge variant={data.student.isActive ? "secondary" : "outline"}>
                    {data.student.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Phone: </span>
                  <span className="font-medium">{data.student.phone ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Onboarding: </span>
                  <span className="font-medium">{data.student.onboardingStep ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Joined: </span>
                  <span className="font-medium">
                    {data.student.createdAt
                      ? new Date(data.student.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* FTS */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Future Talent Score</div>
                <div className="text-xl font-bold font-heading">
                  {data.ftsScores?.totalScore != null
                    ? `${data.ftsScores.totalScore}`
                    : "Not assessed yet"}
                </div>
              </div>
            </div>

            <Separator />

            {/* Checkpoints */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" />Checkpoints
              </h4>
              {data.checkpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checkpoints for this track.</p>
              ) : (
                <div className="space-y-2">
                  {data.checkpoints.map((cp, i) => (
                    <div key={cp.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        CP{cp.order ?? i + 1}: {cp.title ?? "—"}
                      </span>
                      <Badge
                        variant={cp.status === "completed" ? "secondary" : "outline"}
                        className="capitalize"
                      >
                        {cp.status}
                        {cp.score != null ? ` · ${cp.score}` : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Labs */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-primary" />Completed Labs ({data.completedLabs.length})
              </h4>
              {data.completedLabs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No labs completed yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.completedLabs.map((lab) => (
                    <Badge key={lab.labId} variant="outline">{lab.title ?? lab.slug ?? `Lab ${lab.labId}`}</Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Certificates */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />Certificates ({data.certificates.length})
              </h4>
              {data.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.certificates.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cert.title ?? `Certificate #${cert.id}`}</span>
                      {cert.issuedAt && (
                        <span className="text-muted-foreground text-xs">
                          {new Date(cert.issuedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStudentsPage() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/students"],
    queryFn: () => apiFetch<StudentListResponse>("/api/admin/students"),
  });

  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const students = data?.students ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const hay = `${s.fullName ?? ""} ${s.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (trackFilter !== "all" && s.careerTrack !== trackFilter) return false;
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      return true;
    });
  }, [students, search, trackFilter, statusFilter]);

  const toggleStatus = async (s: Student) => {
    setPendingId(s.id);
    const action = s.isActive ? "suspend" : "activate";
    try {
      await apiFetch(`/api/admin/students/${s.id}/${action}`, { method: "POST" });
      toast({
        title: s.isActive ? "Student suspended" : "Student activated",
        description: s.fullName ?? s.email ?? `Student #${s.id}`,
      });
      await refetch();
    } catch (e) {
      toast({
        title: `Failed to ${action} student`,
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setPendingId(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (trackFilter !== "all") params.set("track", trackFilter);
      const qs = params.toString();
      const url = `${BASE}/api/admin/students/export${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("futrsec_token")}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "students.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      toast({ title: "Export started", description: "students.csv downloaded." });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Users}
        title="Student Management"
        subtitle="Search, filter, suspend/activate and inspect students. Career track is immutable."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            <Download className="h-4 w-4 mr-1.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <Select value={trackFilter} onValueChange={setTrackFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tracks</SelectItem>
            <SelectItem value="soc">SOC Analyst</SelectItem>
            <SelectItem value="vapt">VAPT Professional</SelectItem>
            <SelectItem value="grc">GRC Specialist</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description="Try a different search term or adjust your filters."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Career Track</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                    <TableCell><TrackBadge track={s.careerTrack} /></TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "secondary" : "outline"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetailId(s.id)}>
                          <Eye className="h-3.5 w-3.5 mr-1.5" />View
                        </Button>
                        {s.isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={pendingId === s.id}
                            onClick={() => toggleStatus(s)}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1.5" />Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingId === s.id}
                            onClick={() => toggleStatus(s)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Activate
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

      <StudentDetailDialog studentId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
