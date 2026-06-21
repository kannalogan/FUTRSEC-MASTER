import { useState } from "react";
import { useListStudents, useChangeStudentTrack, getListStudentsQueryKey, type AdminStudent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldAlert, Users } from "lucide-react";

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

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const { data, isLoading } = useListStudents(
    debounced ? { search: debounced } : undefined,
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const changeTrack = useChangeStudentTrack();

  const [target, setTarget] = useState<AdminStudent | null>(null);
  const [nextTrack, setNextTrack] = useState<(typeof TRACKS)[number] | null>(null);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebounced(search.trim());
  };

  const confirmChange = () => {
    if (!target || !nextTrack) return;
    changeTrack.mutate(
      { id: target.id, data: { careerTrack: nextTrack } },
      {
        onSuccess: () => {
          toast({
            title: "Track updated",
            description: `${target.fullName ?? target.email} moved to ${TRACK_LABELS[nextTrack]}.`,
          });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey(debounced ? { search: debounced } : undefined) });
          setTarget(null);
          setNextTrack(null);
        },
        onError: () => {
          toast({ title: "Failed to change track", variant: "destructive" });
        },
      },
    );
  };

  const students = data?.students ?? [];

  return (
    <div>
      <PageHeader
        title="Student Management"
        subtitle="Search students and change their permanent career track. All track changes are audit-logged."
      />

      <form onSubmit={onSearch} className="flex gap-2 mb-6 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students found" description="Try a different search term." />
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
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                    <TableCell>
                      {s.careerTrack ? (
                        <Badge
                          style={{ backgroundColor: `${TRACK_COLORS[s.careerTrack]}20`, color: TRACK_COLORS[s.careerTrack] }}
                          className="border-0"
                        >
                          {TRACK_LABELS[s.careerTrack] ?? s.careerTrack}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "secondary" : "outline"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setTarget(s); setNextTrack(null); }}>
                        Change Track
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!target} onOpenChange={(open) => { if (!open) { setTarget(null); setNextTrack(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Career Track</DialogTitle>
            <DialogDescription>
              Reassign <strong>{target?.fullName ?? target?.email}</strong> to a new permanent career track.
              This is a restricted action and will be recorded in the audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Current track:{" "}
              <strong>{target?.careerTrack ? (TRACK_LABELS[target.careerTrack] ?? target.careerTrack) : "Not set"}</strong>
            </p>
            <div className="grid grid-cols-1 gap-2">
              {TRACKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNextTrack(t)}
                  disabled={t === target?.careerTrack}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    nextTrack === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TRACK_COLORS[t] }} />
                  <span className="font-medium text-sm">{TRACK_LABELS[t]}</span>
                  {t === target?.careerTrack && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
                </button>
              ))}
            </div>
          </div>

          {nextTrack && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                The student will immediately gain access to {TRACK_LABELS[nextTrack]} content and lose access to their
                previous track. They cannot undo this themselves.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setTarget(null); setNextTrack(null); }}>Cancel</Button>
            <Button onClick={confirmChange} disabled={!nextTrack || changeTrack.isPending}>
              {changeTrack.isPending ? "Saving…" : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
