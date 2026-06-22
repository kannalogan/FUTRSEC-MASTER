import { Fragment, useMemo, useState } from "react";
import {
  useRetentionPolicies,
  useRetentionRuns,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  usePreviewImpact,
  useRunPurge,
  entityLabel,
  type RetentionPolicy,
  type RetentionPurgeRun,
  type RetentionRunResult,
} from "@/lib/retention-api";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ShieldCheck, Plus, Pencil, Trash2, Eye, Play, Download,
  ChevronDown, ChevronRight, Clock, Database, AlertTriangle,
} from "lucide-react";

interface PolicyFormState {
  entityType: string;
  retentionDays: string;
  legalBasis: string;
  description: string;
}
const EMPTY_FORM: PolicyFormState = {
  entityType: "",
  retentionDays: "",
  legalBasis: "",
  description: "",
};

function statusBadge(status: string) {
  const map: Record<string, "secondary" | "outline" | "destructive" | "default"> = {
    completed: "secondary",
    running: "default",
    failed: "destructive",
  };
  return <Badge variant={map[status] ?? "outline"} className="capitalize">{status}</Badge>;
}

export default function AdminRetentionPage() {
  const { toast } = useToast();
  const { data: policiesData, isLoading: policiesLoading } = useRetentionPolicies();
  const { data: runsData, isLoading: runsLoading } = useRetentionRuns();

  const policies = policiesData?.policies ?? [];
  const knownTypes = policiesData?.knownEntityTypes ?? [];
  const runs = runsData?.runs ?? [];

  const usedTypes = useMemo(() => new Set(policies.map((p) => p.entityType)), [policies]);
  const availableTypes = knownTypes.filter((t) => !usedTypes.has(t));

  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();
  const previewImpact = usePreviewImpact();
  const runPurge = useRunPurge();

  // ---- Policy create / edit ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RetentionPolicy | null>(null);
  const [form, setForm] = useState<PolicyFormState>(EMPTY_FORM);
  const setF = <K extends keyof PolicyFormState>(k: K, v: PolicyFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, entityType: availableTypes[0] ?? "" });
    setDialogOpen(true);
  };
  const openEdit = (p: RetentionPolicy) => {
    setEditing(p);
    setForm({
      entityType: p.entityType,
      retentionDays: String(p.retentionDays),
      legalBasis: p.legalBasis,
      description: p.description ?? "",
    });
    setDialogOpen(true);
  };

  const savePolicy = () => {
    const days = Number(form.retentionDays);
    if (!editing && !form.entityType) {
      toast({ title: "Select an entity type", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(days) || days < 1) {
      toast({ title: "Retention days must be a positive integer", variant: "destructive" });
      return;
    }
    if (form.legalBasis.trim().length < 1) {
      toast({ title: "Legal basis is required", variant: "destructive" });
      return;
    }
    if (editing) {
      updatePolicy.mutate(
        {
          id: editing.id,
          retentionDays: days,
          legalBasis: form.legalBasis.trim(),
          description: form.description.trim() || null,
        },
        {
          onSuccess: () => { toast({ title: "Policy updated" }); setDialogOpen(false); },
          onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
        }
      );
    } else {
      createPolicy.mutate(
        {
          entityType: form.entityType,
          retentionDays: days,
          legalBasis: form.legalBasis.trim(),
          description: form.description.trim() || undefined,
        },
        {
          onSuccess: () => { toast({ title: "Policy created" }); setDialogOpen(false); },
          onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
        }
      );
    }
  };

  // ---- Delete ----
  const [deleteTarget, setDeleteTarget] = useState<RetentionPolicy | null>(null);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deletePolicy.mutate(deleteTarget.id, {
      onSuccess: () => { toast({ title: "Policy deleted" }); setDeleteTarget(null); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  // ---- Preview impact ----
  const [preview, setPreview] = useState<RetentionRunResult | null>(null);
  const runPreview = () => {
    previewImpact.mutate(undefined, {
      onSuccess: (d) => { setPreview(d.result); toast({ title: "Preview generated" }); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  // ---- Run purge ----
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const confirmPurge = () => {
    runPurge.mutate(false, {
      onSuccess: (d) => {
        setPurgeConfirm(false);
        toast({
          title: d.mode === "queued" ? "Purge queued" : "Purge completed",
          description:
            d.result != null
              ? `${d.result.totalDeleted} records purged.`
              : "Running in background.",
        });
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  // ---- Runs expand ----
  const [expanded, setExpanded] = useState<number | null>(null);

  const exportRuns = () => {
    exportToCSV<RetentionPurgeRun>(
      `retention-runs-${format(new Date(), "yyyy-MM-dd")}`,
      [
        { key: "id", label: "Run ID" },
        { key: "trigger", label: "Trigger" },
        { key: "dryRun", label: "Dry Run", format: (r) => (r.dryRun ? "Yes" : "No") },
        { key: "status", label: "Status" },
        { key: "totalDeleted", label: "Total Deleted" },
        {
          key: "summary",
          label: "Summary",
          format: (r) =>
            r.summary
              ? Object.entries(r.summary).map(([k, v]) => `${k}:${v}`).join("; ")
              : "",
        },
        { key: "error", label: "Error", format: (r) => r.error ?? "" },
        {
          key: "startedAt",
          label: "Started",
          format: (r) => format(new Date(r.startedAt), "yyyy-MM-dd HH:mm:ss"),
        },
        {
          key: "completedAt",
          label: "Completed",
          format: (r) => (r.completedAt ? format(new Date(r.completedAt), "yyyy-MM-dd HH:mm:ss") : ""),
        },
      ],
      runs
    );
  };

  // ---- Analytics data ----
  const overTime = useMemo(() => {
    return runs
      .filter((r) => !r.dryRun && r.status === "completed")
      .slice()
      .reverse()
      .map((r) => ({
        date: format(new Date(r.startedAt), "dd MMM"),
        deleted: r.totalDeleted,
      }));
  }, [runs]);

  const byEntity = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of runs) {
      if (r.dryRun || r.status !== "completed" || !r.summary) continue;
      for (const [k, v] of Object.entries(r.summary)) {
        totals[k] = (totals[k] ?? 0) + (Number(v) || 0);
      }
    }
    return Object.entries(totals).map(([entity, total]) => ({
      entity: entityLabel(entity),
      total,
    }));
  }, [runs]);

  const hasOverTime = overTime.some((d) => d.deleted > 0);
  const hasByEntity = byEntity.some((d) => d.total > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={ShieldCheck}
        title="DPDP Data Retention"
        subtitle="Define retention policies and run compliant data-minimisation purges (DPDP Act 2023)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={runPreview} disabled={previewImpact.isPending}>
              <Eye className="h-4 w-4 mr-1.5" /> {previewImpact.isPending ? "Previewing…" : "Preview Impact"}
            </Button>
            <Button variant="destructive" onClick={() => setPurgeConfirm(true)} disabled={runPurge.isPending}>
              <Play className="h-4 w-4 mr-1.5" /> Run Purge Now
            </Button>
          </div>
        }
      />

      {/* Preview result */}
      {preview && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" /> Preview Impact — records that would be purged
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>Dismiss</Button>
            </div>
            {Object.keys(preview.summary).length === 0 ? (
              <p className="text-sm text-muted-foreground">No policies configured to evaluate.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(preview.summary).map(([entity, count]) => (
                  <div key={entity} className="rounded-xl border border-border bg-muted/40 p-3">
                    <div className="text-2xl font-bold font-heading text-foreground leading-none">{count}</div>
                    <div className="text-xs text-muted-foreground mt-1">{entityLabel(entity)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Policies */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" /> Retention Policies
        </h2>
        <Button onClick={openCreate} disabled={availableTypes.length === 0}>
          <Plus className="h-4 w-4 mr-1.5" /> New Policy
        </Button>
      </div>

      {policiesLoading ? (
        <CardSkeleton rows={6} />
      ) : policies.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No retention policies"
          description="Create a policy to define how long each data category is retained."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> New Policy</Button>}
        />
      ) : (
        <Card className="mb-8">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Legal Basis</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{entityLabel(p.entityType)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary">{p.retentionDays} days</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px]">{p.legalBasis}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[260px]">{p.description ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
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

      {/* Analytics */}
      <h2 className="text-lg font-semibold text-foreground mb-3">Purge Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Records Purged Over Time</h3>
            {hasOverTime ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={overTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="deleted" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Clock} title="No purge history" description="Completed purges will be charted here." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Total Purged by Entity</h3>
            {hasByEntity ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byEntity} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="entity" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Database} title="No purge data" description="Per-entity purge totals will appear here." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Runs history */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" /> Purge Run History
        </h2>
        <Button variant="outline" onClick={exportRuns} disabled={runs.length === 0}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {runsLoading ? (
        <CardSkeleton rows={6} />
      ) : runs.length === 0 ? (
        <EmptyState icon={Clock} title="No purge runs yet" description="Scheduled and manual purge runs will be listed here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Started</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deleted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <Fragment key={r.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <TableCell>
                        {expanded === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(r.startedAt), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="capitalize">{r.trigger}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.dryRun ? "Dry run" : "Purge"}</Badge>
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="font-medium">{r.totalDeleted}</TableCell>
                    </TableRow>
                    {expanded === r.id && (
                      <TableRow key={`${r.id}-detail`} className="bg-muted/30">
                        <TableCell colSpan={6}>
                          <div className="p-2 space-y-2">
                            {r.error && (
                              <div className="flex items-start gap-2 text-sm text-destructive">
                                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{r.error}</span>
                              </div>
                            )}
                            {r.completedAt && (
                              <p className="text-xs text-muted-foreground">
                                Completed {format(new Date(r.completedAt), "dd MMM yyyy, HH:mm:ss")}
                              </p>
                            )}
                            {r.summary && Object.keys(r.summary).length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {Object.entries(r.summary).map(([entity, count]) => (
                                  <div key={entity} className="rounded-lg border border-border bg-card p-2.5">
                                    <div className="text-lg font-bold text-foreground leading-none">{count}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{entityLabel(entity)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No per-entity summary recorded.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Policy" : "New Retention Policy"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the retention duration and legal basis for this data category."
                : "Define how long records of a data category are retained before purge."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Entity Type</Label>
              <Select
                value={form.entityType}
                onValueChange={(v) => setF("entityType", v)}
                disabled={!!editing}
              >
                <SelectTrigger><SelectValue placeholder="Select an entity type" /></SelectTrigger>
                <SelectContent>
                  {editing ? (
                    <SelectItem value={editing.entityType}>{entityLabel(editing.entityType)}</SelectItem>
                  ) : (
                    availableTypes.map((t) => (
                      <SelectItem key={t} value={t}>{entityLabel(t)}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ret-days">Retention (days)</Label>
              <Input
                id="ret-days"
                type="number"
                min={1}
                value={form.retentionDays}
                onChange={(e) => setF("retentionDays", e.target.value)}
                placeholder="365"
              />
            </div>
            <div>
              <Label htmlFor="ret-basis">Legal Basis</Label>
              <Input
                id="ret-basis"
                value={form.legalBasis}
                onChange={(e) => setF("legalBasis", e.target.value)}
                placeholder="DPDP Act 2023 — storage limitation"
              />
            </div>
            <div>
              <Label htmlFor="ret-desc">Description</Label>
              <Textarea
                id="ret-desc"
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
                rows={3}
                placeholder="What this policy covers and why."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePolicy} disabled={createPolicy.isPending || updatePolicy.isPending}>
              {createPolicy.isPending || updatePolicy.isPending
                ? "Saving…"
                : editing ? "Save Changes" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete retention policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the retention policy for{" "}
              <span className="font-medium text-foreground">{deleteTarget ? entityLabel(deleteTarget.entityType) : ""}</span>.
              Future purges will no longer act on this data category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletePolicy.isPending}>
              {deletePolicy.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge confirm */}
      <AlertDialog open={purgeConfirm} onOpenChange={setPurgeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run data purge now?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes records older than their retention period across all
              configured policies. This action cannot be undone. Run a Preview Impact first if
              you're unsure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurge} disabled={runPurge.isPending}>
              {runPurge.isPending ? "Purging…" : "Run Purge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
