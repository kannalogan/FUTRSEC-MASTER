import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, downloadFile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import {
  Award, Plus, BadgeCheck, Link2, Ban, ShieldCheck, ShieldX, Search, Pencil,
  Download, FileDown, FileStack, BarChart3, Loader2, Clock,
  Play, Pause, XCircle, RotateCcw, Settings2, Activity, CheckCircle2,
  AlertTriangle, Gauge, Wifi, WifiOff, Layers,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function downloadBulkZip(certificateIds: number[]): Promise<void> {
  const token = localStorage.getItem("futrsec_token");
  const res = await fetch(`${BASE}/api/admin/certificates/bulk-download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ certificateIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `certificates-${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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

const CERT_TYPES = [
  { value: "course_completion", label: "Course Completion" },
  { value: "internship", label: "Internship" },
  { value: "achievement", label: "Achievement" },
];
function certTypeLabel(t: string): string {
  return CERT_TYPES.find((c) => c.value === t)?.label ?? t;
}

const NO_TRACK = "__none__";

interface Template {
  id: number;
  name: string;
  type: string;
  careerTrack: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  signatureName: string | null;
  bodyTemplate: string | null;
  isActive: boolean;
}
interface TemplatesResp {
  templates: Template[];
}

interface Certificate {
  id: number;
  certificateCode: string;
  userId: number;
  type: string;
  title: string;
  careerTrack: string | null;
  issuedDate: string | null;
  verifyToken: string;
  status: string;
  holderName: string | null;
  holderEmail: string | null;
}
interface CertificatesResp {
  certificates: Certificate[];
}

interface IssuedCert {
  certificateCode: string;
  verifyToken: string;
}

function publicVerifyUrl(token: string): string {
  return `${window.location.origin}/verify/${token}`;
}

export default function AdminCertificatesPage() {
  return (
    <div>
      <PageHeader
        title="Certificates"
        subtitle="Issue and manage verified certificates and templates."
        icon={Award}
      />
      <Tabs defaultValue="issued">
        <TabsList className="mb-6">
          <TabsTrigger value="issued">Issued</TabsTrigger>
          <TabsTrigger value="jobs">Bulk Jobs</TabsTrigger>
          <TabsTrigger value="auto-issue">Auto-Issue</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="issued">
          <IssuedTab />
        </TabsContent>
        <TabsContent value="jobs">
          <BulkJobsTab />
        </TabsContent>
        <TabsContent value="auto-issue">
          <AutoIssueTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Issued tab
// ────────────────────────────────────────────────────────────────────────────

function IssuedTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const listKey = "/api/admin/certificates";
  const { data, isLoading } = useQuery({
    queryKey: [listKey],
    queryFn: () => apiFetch<CertificatesResp>(listKey),
  });
  const { data: templatesData } = useQuery({
    queryKey: ["/api/admin/certificates/templates"],
    queryFn: () => apiFetch<TemplatesResp>("/api/admin/certificates/templates"),
  });

  const certificates = data?.certificates ?? [];
  const templates = templatesData?.templates ?? [];

  const [issueOpen, setIssueOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<"generate" | "download" | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<number | null>(null);

  const allSelected = certificates.length > 0 && selected.size === certificates.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(certificates.map((c) => c.id)));
  };
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadPdf = async (c: Certificate) => {
    setPdfBusyId(c.id);
    try {
      await downloadFile(`/api/certificates/${c.id}/pdf`, `${c.certificateCode}.pdf`);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Download failed", variant: "destructive" });
    } finally {
      setPdfBusyId(null);
    }
  };

  const bulkGenerate = async () => {
    if (selected.size === 0) return;
    setBulkBusy("generate");
    try {
      const res = await apiFetch<{ jobId: number; total: number }>(
        "/api/admin/certificates/jobs",
        { method: "POST", body: JSON.stringify({ certificateIds: [...selected] }) },
      );
      toast({
        title: `Bulk job #${res.jobId} queued`,
        description: `${res.total} certificate${res.total === 1 ? "" : "s"} — track progress in the Bulk Jobs tab.`,
      });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/certificates/jobs"] });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Bulk job failed", variant: "destructive" });
    } finally {
      setBulkBusy(null);
    }
  };

  const bulkDownload = async () => {
    if (selected.size === 0) return;
    setBulkBusy("download");
    try {
      await downloadBulkZip([...selected]);
      toast({ title: `Downloading ${selected.size} certificate${selected.size === 1 ? "" : "s"}` });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Bulk download failed", variant: "destructive" });
    } finally {
      setBulkBusy(null);
    }
  };

  const copyVerify = async (token: string) => {
    const url = publicVerifyUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Verify link copied", description: url });
    } catch {
      window.open(url, "_blank");
    }
  };

  const revokeMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/admin/certificates/${id}/revoke`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      toast({ title: "Certificate revoked" });
      setRevokeTarget(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <Button variant="outline" size="sm" onClick={bulkGenerate} disabled={bulkBusy !== null}>
                {bulkBusy === "generate" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileStack className="h-4 w-4 mr-1.5" />
                )}
                Bulk job
              </Button>
              <Button variant="outline" size="sm" onClick={bulkDownload} disabled={bulkBusy !== null}>
                {bulkBusy === "download" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-1.5" />
                )}
                Download ZIP
              </Button>
            </>
          )}
        </div>
        <Button onClick={() => setIssueOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Issue Certificate
        </Button>
      </div>

      <VerifyPanel />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates issued"
          description="Issue your first certificate to a student."
          action={
            <Button onClick={() => setIssueOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Issue Certificate
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.certificateCode}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.certificateCode}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.holderName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.holderEmail ?? ""}</div>
                    </TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{certTypeLabel(c.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === "issued" ? "secondary" : "outline"}
                        className={
                          c.status === "revoked"
                            ? "bg-destructive/15 text-destructive border-destructive/30"
                            : c.status === "expired"
                              ? "bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1"
                              : ""
                        }
                      >
                        {c.status === "expired" && <Clock className="h-3 w-3" />}
                        {c.status === "issued" ? "Issued" : c.status === "revoked" ? "Revoked" : c.status === "expired" ? "Expired" : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.issuedDate ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pdfBusyId === c.id}
                          onClick={() => downloadPdf(c)}
                        >
                          {pdfBusyId === c.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyVerify(c.verifyToken)}>
                          <Link2 className="h-4 w-4 mr-1" /> Verify link
                        </Button>
                        {c.status === "issued" && (
                          <Button size="sm" variant="ghost" onClick={() => setRevokeTarget(c)}>
                            <Ban className="h-4 w-4 mr-1 text-destructive" /> Revoke
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

      <IssueDialog open={issueOpen} onClose={() => setIssueOpen(false)} templates={templates} listKey={listKey} />

      {/* Revoke confirm */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
            <DialogDescription>
              Revoke <strong>{revokeTarget?.certificateCode}</strong> issued to{" "}
              <strong>{revokeTarget?.holderName ?? revokeTarget?.holderEmail}</strong>? The public verify link will
              report it as invalid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => revokeTarget && revokeMut.mutate(revokeTarget.id)}
              disabled={revokeMut.isPending}
            >
              {revokeMut.isPending ? "Revoking…" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VerifyPanel() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{
    valid: boolean;
    certificate?: {
      code: string;
      holderName: string | null;
      title: string;
      type: string;
      careerTrack: string | null;
      issuedDate: string | null;
    };
  } | null>(null);

  const verifyMut = useMutation({
    mutationFn: (t: string) =>
      apiFetch<{
        valid: boolean;
        certificate?: {
          code: string;
          holderName: string | null;
          title: string;
          type: string;
          careerTrack: string | null;
          issuedDate: string | null;
        };
      }>(`/api/certificates/verify/${encodeURIComponent(t)}`),
    onSuccess: (res) => setResult(res),
    onError: () => setResult({ valid: false }),
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Verify Certificate</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste a verify token to check a certificate via the public endpoint.
        </p>
        <div className="flex gap-2">
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Verify token"
            className="font-mono"
          />
          <Button
            variant="secondary"
            onClick={() => token.trim() && verifyMut.mutate(token.trim())}
            disabled={verifyMut.isPending || !token.trim()}
          >
            <Search className="h-4 w-4 mr-1.5" /> Verify
          </Button>
        </div>

        {result && (
          result.valid && result.certificate ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Valid — {result.certificate.code}</p>
                <p className="text-xs">
                  {result.certificate.holderName ?? "Unknown"} · {result.certificate.title} ·{" "}
                  {certTypeLabel(result.certificate.type)}
                  {result.certificate.issuedDate ? ` · ${result.certificate.issuedDate}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <ShieldX className="h-4 w-4 shrink-0" />
              <span>Invalid or revoked certificate.</span>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

interface IssueForm {
  userId: string;
  type: string;
  title: string;
  careerTrack: string;
  courseName: string;
  internshipName: string;
  achievementLabel: string;
  mentorId: string;
  durationText: string;
  templateId: string;
}
const EMPTY_ISSUE: IssueForm = {
  userId: "",
  type: "course_completion",
  title: "",
  careerTrack: NO_TRACK,
  courseName: "",
  internshipName: "",
  achievementLabel: "",
  mentorId: "",
  durationText: "",
  templateId: NO_TRACK,
};

function IssueDialog({
  open, onClose, templates, listKey,
}: {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  listKey: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<IssueForm>(EMPTY_ISSUE);
  const [issued, setIssued] = useState<IssuedCert | null>(null);

  const set = <K extends keyof IssueForm>(key: K, value: IssueForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const issueMut = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      apiFetch<{ certificate: IssuedCert }>("/api/admin/certificates/issue", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      toast({ title: "Certificate issued" });
      setIssued(res.certificate);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const submit = () => {
    const userId = Number(form.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      toast({ title: "Valid user ID is required", variant: "destructive" });
      return;
    }
    const title = form.title.trim();
    if (title.length < 1) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const body: Record<string, unknown> = { userId, type: form.type, title };
    if (form.careerTrack !== NO_TRACK) body.careerTrack = form.careerTrack;
    if (form.type === "course_completion" && form.courseName.trim()) body.courseName = form.courseName.trim();
    if (form.type === "internship" && form.internshipName.trim()) body.internshipName = form.internshipName.trim();
    if (form.type === "achievement" && form.achievementLabel.trim()) body.achievementLabel = form.achievementLabel.trim();
    if (form.mentorId && Number(form.mentorId) > 0) body.mentorId = Number(form.mentorId);
    if (form.durationText.trim()) body.durationText = form.durationText.trim();
    if (form.templateId !== NO_TRACK) body.templateId = Number(form.templateId);
    issueMut.mutate(body);
  };

  const handleClose = () => {
    setForm(EMPTY_ISSUE);
    setIssued(null);
    onClose();
  };

  const copyLink = async () => {
    if (!issued) return;
    const url = publicVerifyUrl(issued.verifyToken);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Verify link copied", description: url });
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Certificate</DialogTitle>
          <DialogDescription>Issue a verified certificate to a student.</DialogDescription>
        </DialogHeader>

        {issued ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Certificate issued</p>
                <p className="font-mono text-xs mt-1">{issued.certificateCode}</p>
              </div>
            </div>
            <div>
              <Label>Public verify link</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={publicVerifyUrl(issued.verifyToken)} className="font-mono text-xs" />
                <Button variant="secondary" onClick={copyLink}>
                  <Link2 className="h-4 w-4 mr-1" /> Copy
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="i-user">User ID</Label>
                <Input
                  id="i-user"
                  type="number"
                  min={1}
                  value={form.userId}
                  onChange={(e) => set("userId", e.target.value)}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CERT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="i-title">Title</Label>
              <Input
                id="i-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. SOC Analyst Program Completion"
              />
            </div>
            <div>
              <Label>Career Track</Label>
              <Select value={form.careerTrack} onValueChange={(v) => set("careerTrack", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRACK}>None</SelectItem>
                  {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.type === "course_completion" && (
              <div>
                <Label htmlFor="i-course">Course Name</Label>
                <Input id="i-course" value={form.courseName} onChange={(e) => set("courseName", e.target.value)} />
              </div>
            )}
            {form.type === "internship" && (
              <div>
                <Label htmlFor="i-intern">Internship Name</Label>
                <Input id="i-intern" value={form.internshipName} onChange={(e) => set("internshipName", e.target.value)} />
              </div>
            )}
            {form.type === "achievement" && (
              <div>
                <Label htmlFor="i-ach">Achievement Label</Label>
                <Input id="i-ach" value={form.achievementLabel} onChange={(e) => set("achievementLabel", e.target.value)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="i-mentor">Mentor ID (optional)</Label>
                <Input id="i-mentor" type="number" min={1} value={form.mentorId} onChange={(e) => set("mentorId", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="i-dur">Duration Text (optional)</Label>
                <Input id="i-dur" value={form.durationText} onChange={(e) => set("durationText", e.target.value)} placeholder="e.g. 12 weeks" />
              </div>
            </div>
            <div>
              <Label>Template (optional)</Label>
              <Select value={form.templateId} onValueChange={(v) => set("templateId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRACK}>No template</SelectItem>
                  {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          {issued ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={submit} disabled={issueMut.isPending}>
                {issueMut.isPending ? "Issuing…" : "Issue"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Templates tab
// ────────────────────────────────────────────────────────────────────────────

interface TemplateForm {
  name: string;
  type: string;
  careerTrack: string;
  logoUrl: string;
  signatureUrl: string;
  signatureName: string;
  bodyTemplate: string;
  isActive: boolean;
}
const EMPTY_TEMPLATE: TemplateForm = {
  name: "",
  type: "course_completion",
  careerTrack: NO_TRACK,
  logoUrl: "",
  signatureUrl: "",
  signatureName: "",
  bodyTemplate: "",
  isActive: true,
};

function TemplatesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const listKey = "/api/admin/certificates/templates";
  const { data, isLoading } = useQuery({
    queryKey: [listKey],
    queryFn: () => apiFetch<TemplatesResp>(listKey),
  });
  const templates = data?.templates ?? [];

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_TEMPLATE);

  const set = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_TEMPLATE);
    setOpen(true);
  };
  const openEdit = (t: Template) => {
    setEditId(t.id);
    setForm({
      name: t.name,
      type: t.type,
      careerTrack: t.careerTrack ?? NO_TRACK,
      logoUrl: t.logoUrl ?? "",
      signatureUrl: t.signatureUrl ?? "",
      signatureName: t.signatureName ?? "",
      bodyTemplate: t.bodyTemplate ?? "",
      isActive: t.isActive,
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: (vars: { id: number | null; body: Record<string, unknown> }) =>
      apiFetch(
        vars.id ? `/api/admin/certificates/templates/${vars.id}` : "/api/admin/certificates/templates",
        { method: vars.id ? "PATCH" : "POST", body: JSON.stringify(vars.body) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      toast({ title: editId ? "Template updated" : "Template created" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const save = () => {
    const name = form.name.trim();
    if (name.length < 1) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const body: Record<string, unknown> = {
      name,
      type: form.type,
      careerTrack: form.careerTrack === NO_TRACK ? null : form.careerTrack,
      logoUrl: form.logoUrl.trim() || null,
      signatureUrl: form.signatureUrl.trim() || null,
      signatureName: form.signatureName.trim() || null,
      bodyTemplate: form.bodyTemplate.trim() || null,
      isActive: form.isActive,
    };
    saveMut.mutate({ id: editId, body });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No templates yet"
          description="Create a certificate template to standardize issued certificates."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> New Template</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline">{certTypeLabel(t.type)}</Badge></TableCell>
                    <TableCell>
                      {t.careerTrack ? (
                        <Badge
                          style={{
                            backgroundColor: `${TRACK_COLORS[t.careerTrack] ?? "#64748B"}20`,
                            color: TRACK_COLORS[t.careerTrack] ?? "#64748B",
                          }}
                          className="border-0"
                        >
                          {TRACK_LABELS[t.careerTrack] ?? t.careerTrack}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.signatureName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "secondary" : "outline"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4 mr-1.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>Configure the certificate template layout and signature.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CERT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Career Track</Label>
                <Select value={form.careerTrack} onValueChange={(v) => set("careerTrack", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TRACK}>None</SelectItem>
                    {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-logo">Logo URL</Label>
                <Input id="t-logo" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="t-sigurl">Signature URL</Label>
                <Input id="t-sigurl" value={form.signatureUrl} onChange={(e) => set("signatureUrl", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="t-signame">Signature Name</Label>
              <Input id="t-signame" value={form.signatureName} onChange={(e) => set("signatureName", e.target.value)} />
            </div>
            <Separator />
            <div>
              <Label htmlFor="t-body">Body Template</Label>
              <Textarea
                id="t-body"
                rows={4}
                value={form.bodyTemplate}
                onChange={(e) => set("bodyTemplate", e.target.value)}
                placeholder="Certificate body text…"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="t-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              <Label htmlFor="t-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving…" : editId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Analytics tab
// ────────────────────────────────────────────────────────────────────────────

interface AnalyticsResp {
  total: number;
  generatedPdfs: number;
  expiredByDate: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  byTrack: { careerTrack: string | null; count: number }[];
}

function AnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/certificates/analytics"],
    queryFn: () => apiFetch<AnalyticsResp>("/api/admin/certificates/analytics"),
  });

  if (isLoading) return <CardSkeleton rows={4} />;
  if (!data) return <EmptyState icon={BarChart3} title="No analytics" description="No certificate data yet." />;

  const stats = [
    { label: "Total Certificates", value: data.total, icon: Award },
    { label: "PDFs Generated", value: data.generatedPdfs, icon: FileStack },
    { label: "Expired (by date)", value: data.expiredByDate, icon: Clock },
  ];

  const statusColor: Record<string, string> = {
    issued: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    revoked: "bg-destructive/15 text-destructive border-destructive/30",
    expired: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold font-heading">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">By Status</h3>
            <div className="space-y-2">
              {data.byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                data.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <Badge variant="outline" className={`capitalize ${statusColor[s.status] ?? ""}`}>
                      {s.status}
                    </Badge>
                    <span className="text-sm font-medium">{s.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">By Type</h3>
            <div className="space-y-2">
              {data.byType.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                data.byType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{certTypeLabel(t.type)}</span>
                    <span className="text-sm font-medium">{t.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-3">By Track</h3>
            <div className="space-y-2">
              {data.byTrack.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                data.byTrack.map((t) => (
                  <div key={t.careerTrack ?? "none"} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t.careerTrack ? (TRACK_LABELS[t.careerTrack] ?? t.careerTrack) : "No track"}
                    </span>
                    <span className="text-sm font-medium">{t.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bulk Jobs tab — BullMQ-backed bulk generation with live WebSocket progress
// ────────────────────────────────────────────────────────────────────────────

interface GenerationJob {
  id: number;
  status: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  failedIds: number[] | null;
  certificateIds: number[];
  avgMsPerCert: number | null;
  durationMs: number | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
interface JobsStats {
  total: number;
  running: number;
  queued: number;
  paused: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalCertificates: number;
  avgMsPerCert: number;
}
interface JobsResp {
  jobs: GenerationJob[];
  stats: JobsStats;
}
interface ProgressMsg {
  type?: string;
  dbJobId?: number;
  status?: string;
  total?: number;
  processed?: number;
  succeeded?: number;
  failed?: number;
  avgMsPerCert?: number | null;
}

const JOB_STATUS_STYLE: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  paused: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground",
};

function fmtMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
function fmtDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function BulkJobsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const listKey = "/api/admin/certificates/jobs";

  const { data, isLoading } = useQuery({
    queryKey: [listKey],
    queryFn: () => apiFetch<JobsResp>(listKey),
    // Poll as a safety net even if the websocket drops.
    refetchInterval: 8000,
  });

  // Live progress overrides keyed by job id, applied on top of the query data.
  const [live, setLive] = useState<Record<number, ProgressMsg>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("futrsec_token");
    if (!token) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}${BASE}/api/certificates/jobs/stream?token=${encodeURIComponent(token)}`;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        if (!closed) reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as ProgressMsg;
          if (msg.type === "connected" || msg.dbJobId == null) return;
          setLive((prev) => ({ ...prev, [msg.dbJobId!]: msg }));
          // Terminal states should refresh the authoritative list + stats.
          if (
            msg.status === "completed" ||
            msg.status === "failed" ||
            msg.status === "cancelled"
          ) {
            queryClient.invalidateQueries({ queryKey: [listKey] });
          }
        } catch {
          /* ignore malformed frames */
        }
      };
    };
    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [queryClient]);

  const jobs = data?.jobs ?? [];
  const stats = data?.stats;

  // Merge live progress into the persisted rows.
  const mergedJobs: GenerationJob[] = jobs.map((j) => {
    const l = live[j.id];
    if (!l) return j;
    return {
      ...j,
      status: l.status ?? j.status,
      processed: l.processed ?? j.processed,
      succeeded: l.succeeded ?? j.succeeded,
      failed: l.failed ?? j.failed,
      avgMsPerCert: l.avgMsPerCert ?? j.avgMsPerCert,
    };
  });

  const action = async (
    id: number,
    verb: "pause" | "resume" | "cancel" | "retry",
  ) => {
    try {
      const res = await apiFetch<{ ok?: boolean; jobId?: number }>(
        `/api/admin/certificates/jobs/${id}/${verb}`,
        { method: "POST" },
      );
      toast({
        title:
          verb === "retry"
            ? `Retry queued${res.jobId ? ` (job #${res.jobId})` : ""}`
            : `Job ${verb} requested`,
      });
      queryClient.invalidateQueries({ queryKey: [listKey] });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : `${verb} failed`,
        variant: "destructive",
      });
    }
  };

  const downloadJobZip = async (id: number) => {
    try {
      await downloadFile(
        `/api/admin/certificates/jobs/${id}/download`,
        `cert-job-${id}.zip`,
      );
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Download failed",
        variant: "destructive",
      });
    }
  };

  const statCards = [
    { label: "Total Jobs", value: stats?.total ?? 0, icon: Layers },
    { label: "Running", value: stats?.running ?? 0, icon: Activity },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2 },
    { label: "Failed", value: stats?.failed ?? 0, icon: AlertTriangle },
    { label: "Avg / Cert", value: fmtMs(stats?.avgMsPerCert), icon: Gauge },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Bulk PDF generation runs on background workers. Select certificates in
          the Issued tab to enqueue a job, or retry failed ones here.
        </p>
        <Badge
          variant="outline"
          className={
            wsConnected
              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"
              : "bg-muted text-muted-foreground gap-1"
          }
        >
          {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {wsConnected ? "Live" : "Offline"}
        </Badge>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold font-heading truncate">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : mergedJobs.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No bulk jobs yet"
          description="Select certificates in the Issued tab and choose 'Bulk job' to enqueue one."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[260px]">Progress</TableHead>
                  <TableHead>Succeeded</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Avg/Cert</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedJobs.map((j) => {
                  const pct =
                    j.total > 0 ? Math.round((j.processed / j.total) * 100) : 0;
                  const active = j.status === "running" || j.status === "queued";
                  const hasFailed = (j.failedIds?.length ?? j.failed) > 0;
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-xs">#{j.id}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${JOB_STATUS_STYLE[j.status] ?? ""}`}
                        >
                          {j.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={pct} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {j.processed} / {j.total} ({pct}%)
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-emerald-600 font-medium">{j.succeeded}</TableCell>
                      <TableCell className={j.failed > 0 ? "text-destructive font-medium" : ""}>{j.failed}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fmtMs(j.avgMsPerCert)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fmtDuration(j.durationMs)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {j.status === "running" && (
                            <Button size="sm" variant="outline" onClick={() => action(j.id, "pause")}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {j.status === "paused" && (
                            <Button size="sm" variant="outline" onClick={() => action(j.id, "resume")}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {active && (
                            <Button size="sm" variant="ghost" onClick={() => action(j.id, "cancel")}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {hasFailed && !active && (
                            <Button size="sm" variant="outline" onClick={() => action(j.id, "retry")}>
                              <RotateCcw className="h-4 w-4 mr-1" /> Retry
                            </Button>
                          )}
                          {j.succeeded > 0 && (
                            <Button size="sm" variant="outline" onClick={() => downloadJobZip(j.id)}>
                              <FileDown className="h-4 w-4 mr-1" /> ZIP
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Auto-Issue tab — per-source automatic issuance configuration
// ────────────────────────────────────────────────────────────────────────────

const SOURCE_TYPES = [
  { value: "course", label: "Course" },
  { value: "learning_path", label: "Learning Path" },
  { value: "lab_series", label: "Lab Series" },
  { value: "career_roadmap", label: "Career Roadmap" },
  { value: "internship", label: "Internship" },
] as const;
function sourceTypeLabel(t: string): string {
  return SOURCE_TYPES.find((s) => s.value === t)?.label ?? t;
}

interface AutoIssueConfig {
  id: number;
  sourceType: string;
  sourceId: number;
  enabled: boolean;
  expiryMonths: number | null;
  allowReissue: boolean;
  templateId: number | null;
  certificateType: string | null;
  updatedAt: string;
}
interface AutoIssueResp {
  configs: AutoIssueConfig[];
}

const EMPTY_CONFIG = {
  sourceType: "course",
  sourceId: "",
  enabled: true,
  expiryMonths: "",
  allowReissue: false,
  certificateType: "",
};

function AutoIssueTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const listKey = "/api/admin/certificates/auto-issue-config";

  const { data, isLoading } = useQuery({
    queryKey: [listKey],
    queryFn: () => apiFetch<AutoIssueResp>(listKey),
  });
  const configs = data?.configs ?? [];

  const [form, setForm] = useState({ ...EMPTY_CONFIG });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const upsertMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ config: AutoIssueConfig }>(listKey, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listKey] });
      toast({ title: "Auto-issue configuration saved" });
      setForm({ ...EMPTY_CONFIG });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const submit = () => {
    const sourceId = Number(form.sourceId);
    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      toast({ title: "Valid source ID is required", variant: "destructive" });
      return;
    }
    const body: Record<string, unknown> = {
      sourceType: form.sourceType,
      sourceId,
      enabled: form.enabled,
      allowReissue: form.allowReissue,
    };
    if (form.expiryMonths !== "" && Number(form.expiryMonths) > 0) {
      body.expiryMonths = Number(form.expiryMonths);
    }
    if (form.certificateType.trim()) {
      body.certificateType = form.certificateType.trim();
    }
    upsertMut.mutate(body);
  };

  const toggleEnabled = (c: AutoIssueConfig, enabled: boolean) => {
    upsertMut.mutate({
      sourceType: c.sourceType,
      sourceId: c.sourceId,
      enabled,
      allowReissue: c.allowReissue,
      expiryMonths: c.expiryMonths,
      certificateType: c.certificateType,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Configure Auto-Issue</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled for a source, completing it automatically issues a
            certificate (PDF, QR, email, and dashboard entry) — once per learner,
            unless re-issue is allowed.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Source type</Label>
              <Select value={form.sourceType} onValueChange={(v) => set("sourceType", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source ID</Label>
              <Input
                className="mt-1"
                type="number"
                value={form.sourceId}
                onChange={(e) => set("sourceId", e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
            <div>
              <Label>Expiry (months, optional)</Label>
              <Input
                className="mt-1"
                type="number"
                value={form.expiryMonths}
                onChange={(e) => set("expiryMonths", e.target.value)}
                placeholder="never"
              />
            </div>
            <div>
              <Label>Certificate type (optional)</Label>
              <Input
                className="mt-1"
                value={form.certificateType}
                onChange={(e) => set("certificateType", e.target.value)}
                placeholder="course_completion"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Enabled</Label>
                <p className="text-xs text-muted-foreground">Issue on completion</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Allow re-issue</Label>
                <p className="text-xs text-muted-foreground">Re-create if exists</p>
              </div>
              <Switch checked={form.allowReissue} onCheckedChange={(v) => set("allowReissue", v)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={upsertMut.isPending}>
              {upsertMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Save configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : configs.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title="No auto-issue rules"
          description="Add a rule above to automatically issue certificates on completion."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Source ID</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Re-issue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{sourceTypeLabel(c.sourceType)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.sourceId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.expiryMonths ? `${c.expiryMonths} mo` : "Never"}
                    </TableCell>
                    <TableCell>
                      {c.allowReissue ? (
                        <Badge variant="secondary">Allowed</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.certificateType ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={c.enabled}
                        onCheckedChange={(v) => toggleEnabled(c, v)}
                        disabled={upsertMut.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
