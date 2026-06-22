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
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Award, Plus, BadgeCheck, Link2, Ban, ShieldCheck, ShieldX, Search, Pencil,
  Download, FileDown, FileStack, BarChart3, Loader2, Clock,
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
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="issued">
          <IssuedTab />
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
      const res = await apiFetch<{ generated: number; failed: number }>(
        "/api/admin/certificates/bulk-generate",
        { method: "POST", body: JSON.stringify({ certificateIds: [...selected] }) },
      );
      toast({
        title: `Generated ${res.generated} PDF${res.generated === 1 ? "" : "s"}`,
        description: res.failed > 0 ? `${res.failed} failed` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: [listKey] });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Bulk generate failed", variant: "destructive" });
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
                Generate PDFs
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
