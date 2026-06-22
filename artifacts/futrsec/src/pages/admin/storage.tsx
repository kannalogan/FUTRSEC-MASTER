import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, downloadFile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  HardDrive, Upload, Download, Eye, Trash2, RotateCcw, History, FolderOpen,
  ShieldCheck, ShieldAlert, ShieldQuestion, Loader2,
} from "lucide-react";

interface FileRecord {
  id: number;
  objectPath: string;
  ownerId: number;
  originalName: string;
  contentType: string;
  size: number;
  folder: string;
  usageArea: string;
  visibility: string;
  version: number;
  parentFileId: number | null;
  isLatest: boolean;
  status: string;
  scanStatus: string;
  expiresAt: string | null;
  createdAt: string;
}
interface FilesResp {
  files: FileRecord[];
  total: number;
  limit: number;
  offset: number;
}
interface QuotaResp {
  quotaBytes: number;
  usedBytes: number;
  availableBytes: number;
}
interface VersionsResp {
  versions: FileRecord[];
}

const USAGE_AREAS = [
  "all",
  "general",
  "certificates",
  "resumes",
  "assignments",
  "labs",
  "courses",
  "lessons",
  "job_descriptions",
  "employer_documents",
  "tpo_files",
  "mentor_resources",
  "community",
  "support",
] as const;

function formatBytes(n: number): string {
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function scanBadge(scan: string) {
  if (scan === "clean" || scan === "passed") {
    return (
      <Badge variant="outline" className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
        <ShieldCheck className="h-3 w-3" /> Clean
      </Badge>
    );
  }
  if (scan === "infected") {
    return (
      <Badge variant="outline" className="gap-1 bg-destructive/15 text-destructive border-destructive/30">
        <ShieldAlert className="h-3 w-3" /> Infected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <ShieldQuestion className="h-3 w-3" /> {scan}
    </Badge>
  );
}

export default function AdminStoragePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usageArea, setUsageArea] = useState<string>("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [versionsFor, setVersionsFor] = useState<FileRecord | null>(null);

  const listParams = new URLSearchParams();
  if (scope === "all") listParams.set("scope", "all");
  if (usageArea !== "all") listParams.set("usageArea", usageArea);
  if (includeDeleted) listParams.set("includeDeleted", "true");
  const listKey = `/api/storage/files?${listParams.toString()}`;

  const { data, isLoading } = useQuery({
    queryKey: [listKey],
    queryFn: () => apiFetch<FilesResp>(listKey),
  });
  const { data: quota } = useQuery({
    queryKey: ["/api/storage/quota"],
    queryFn: () => apiFetch<QuotaResp>("/api/storage/quota"),
  });

  const files = data?.files ?? [];
  const usedPct = quota && quota.quotaBytes > 0
    ? Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100))
    : 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [listKey] });
    queryClient.invalidateQueries({ queryKey: ["/api/storage/quota"] });
  };

  const handleFilePicked = async (file: File) => {
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await apiFetch<{ uploadURL: string; objectPath: string }>(
        "/api/storage/uploads/request-url",
        {
          method: "POST",
          body: JSON.stringify({
            name: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          }),
        },
      );

      const put = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      await apiFetch("/api/storage/files", {
        method: "POST",
        body: JSON.stringify({
          objectPath,
          name: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          usageArea: usageArea !== "all" ? usageArea : "general",
        }),
      });

      toast({ title: "File uploaded", description: file.name });
      refresh();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/storage/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "File deleted" });
      refresh();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const restoreMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/storage/files/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "File restored" });
      refresh();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleDownload = async (f: FileRecord) => {
    setBusyId(f.id);
    try {
      await downloadFile(`/api/storage/files/${f.id}/download`, f.originalName);
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handlePreview = (f: FileRecord) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = localStorage.getItem("futrsec_token");
    apiFetch<{ url: string }>(`/api/storage/files/${f.id}/signed-url`, {
      method: "POST",
      body: JSON.stringify({ ttlSeconds: 3600 }),
    })
      .then((res) => window.open(`${base}${res.url}`, "_blank"))
      .catch(() => {
        // Fallback: authenticated inline preview is not openable via plain link,
        // so signed-url is the canonical preview path. Surface the error.
        toast({
          title: "Preview unavailable",
          description: token ? "Could not create a preview link." : "Sign in required.",
          variant: "destructive",
        });
      });
  };

  return (
    <div>
      <PageHeader
        title="File Storage"
        subtitle="Manage uploaded files, versions, quota, and virus-scan status across the platform."
        icon={HardDrive}
      />

      {/* Quota */}
      {quota && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <HardDrive className="h-4 w-4 text-primary" /> Storage Quota
              </div>
              <span className="text-sm text-muted-foreground">
                {formatBytes(quota.usedBytes)} / {formatBytes(quota.quotaBytes)} ({usedPct}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usedPct > 90 ? "bg-destructive" : usedPct > 70 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(quota.availableBytes)} available
            </p>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={usageArea} onValueChange={setUsageArea}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Usage area" />
          </SelectTrigger>
          <SelectContent>
            {USAGE_AREAS.map((a) => (
              <SelectItem key={a} value={a} className="capitalize">
                {a === "all" ? "All areas" : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scope} onValueChange={(v) => setScope(v as "all" | "mine")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            <SelectItem value="mine">My files</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={includeDeleted ? "secondary" : "outline"}
          onClick={() => setIncludeDeleted((v) => !v)}
        >
          {includeDeleted ? "Showing deleted" : "Hide deleted"}
        </Button>
        <div className="ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFilePicked(f);
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            {uploading ? "Uploading…" : "Upload File"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No files found"
          description="Upload a file or adjust your filters to see stored files."
          action={
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" /> Upload File
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Ver</TableHead>
                  <TableHead>Scan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => {
                  const deleted = f.status === "deleted";
                  return (
                    <TableRow key={f.id} className={deleted ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="font-medium truncate max-w-[260px]">{f.originalName}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[260px]">
                          {f.folder}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{f.usageArea}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatBytes(f.size)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">v{f.version}</TableCell>
                      <TableCell>{scanBadge(f.scanStatus)}</TableCell>
                      <TableCell>
                        <Badge variant={deleted ? "outline" : "secondary"} className="capitalize">
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Preview"
                            disabled={deleted}
                            onClick={() => handlePreview(f)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Download"
                            disabled={deleted || busyId === f.id}
                            onClick={() => handleDownload(f)}
                          >
                            {busyId === f.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Version history"
                            onClick={() => setVersionsFor(f)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {deleted ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Restore"
                              disabled={restoreMut.isPending}
                              onClick={() => restoreMut.mutate(f.id)}
                            >
                              <RotateCcw className="h-4 w-4 text-emerald-600" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Delete"
                              disabled={deleteMut.isPending}
                              onClick={() => deleteMut.mutate(f.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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

      <VersionsDialog file={versionsFor} onClose={() => setVersionsFor(null)} />
    </div>
  );
}

function VersionsDialog({ file, onClose }: { file: FileRecord | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/storage/files/${file?.id}/versions`],
    queryFn: () => apiFetch<VersionsResp>(`/api/storage/files/${file!.id}/versions`),
    enabled: !!file,
  });
  const versions = data?.versions ?? [];

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription className="truncate">{file?.originalName}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <CardSkeleton rows={3} />
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No versions found.</p>
        ) : (
          <div className="space-y-2 py-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">
                    v{v.version} {v.isLatest && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">Latest</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(v.size)} · {new Date(v.createdAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadFile(`/api/storage/files/${v.id}/download`, v.originalName)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download
                </Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
