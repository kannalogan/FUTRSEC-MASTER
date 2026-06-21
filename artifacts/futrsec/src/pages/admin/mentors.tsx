import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import {
  UserCog, Plus, Users, Layers, Search, ShieldCheck,
} from "lucide-react";

const TRACK_LABELS: Record<string, string> = {
  soc: "SOC Analyst", vapt: "VAPT Professional", grc: "GRC Specialist",
};
const TRACK_COLORS: Record<string, string> = {
  soc: "#2563EB", vapt: "#F97316", grc: "#10B981",
};
const TRACKS = ["soc", "vapt", "grc"] as const;

interface AdminMentor {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  careerTrack: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  specialization: string | null;
  company: string | null;
  designation: string | null;
  yearsOfExperience: number | null;
  studentCount: number;
  batchCount: number;
}

interface AdminBatch {
  id: number;
  name: string;
  code: string | null;
  careerTrack: string;
  mentorId: number | null;
  mentorName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  studentCount: number;
}

interface SimpleStudent {
  id: number;
  email: string | null;
  fullName: string | null;
  careerTrack: string | null;
}

function useMentors(search: string) {
  return useQuery({
    queryKey: ["admin", "mentors", search],
    queryFn: () =>
      apiFetch<{ mentors: AdminMentor[] }>(
        `/api/admin/mentors${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}
function useBatches() {
  return useQuery({
    queryKey: ["admin", "batches"],
    queryFn: () => apiFetch<{ batches: AdminBatch[] }>("/api/admin/batches"),
  });
}

export default function AdminMentorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const { data: mentorsData, isLoading } = useMentors(debounced);
  const { data: batchesData } = useBatches();

  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminMentor | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const mentors = mentorsData?.mentors ?? [];
  const batches = batchesData?.batches ?? [];

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiFetch(`/api/admin/mentors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      toast({ title: "Mentor updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const changeTrack = useMutation({
    mutationFn: ({ id, careerTrack }: { id: number; careerTrack: string }) =>
      apiFetch(`/api/admin/mentors/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ careerTrack }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      toast({ title: "Track updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={UserCog}
        title="Mentor Management"
        subtitle="Create mentor accounts, assign tracks, batches and students. Mentors cannot self-register."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Mentor
          </Button>
        }
      />

      <Tabs defaultValue="mentors">
        <TabsList className="mb-4">
          <TabsTrigger value="mentors">Mentors</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="mentors">
          <form
            onSubmit={(e) => { e.preventDefault(); setDebounced(search.trim()); }}
            className="flex gap-2 mb-4 max-w-md"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mentors"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>

          {isLoading ? (
            <CardSkeleton rows={6} />
          ) : mentors.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="No mentors yet"
              description="Create the first mentor account to get started."
              action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Mentor</Button>}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Batches</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentors.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.fullName ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={m.careerTrack ?? undefined}
                            onValueChange={(v) => changeTrack.mutate({ id: m.id, careerTrack: v })}
                          >
                            <SelectTrigger className="h-8 w-[150px]">
                              <SelectValue placeholder="Set track" />
                            </SelectTrigger>
                            <SelectContent>
                              {TRACKS.map((t) => (
                                <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{m.studentCount}</TableCell>
                        <TableCell>{m.batchCount}</TableCell>
                        <TableCell>
                          <Switch
                            checked={m.isActive}
                            onCheckedChange={(v) => toggleActive.mutate({ id: m.id, isActive: v })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setAssignTarget(m)}>
                            <Users className="h-3.5 w-3.5 mr-1.5" /> Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="batches">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setBatchOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> New Batch
            </Button>
          </div>
          {batches.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No batches yet"
              description="Create a batch and assign a mentor to it."
              action={<Button onClick={() => setBatchOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Batch</Button>}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Mentor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: `${TRACK_COLORS[b.careerTrack]}20`, color: TRACK_COLORS[b.careerTrack] }} className="border-0">
                            {TRACK_LABELS[b.careerTrack] ?? b.careerTrack}
                          </Badge>
                        </TableCell>
                        <TableCell>{b.mentorName ?? <span className="text-muted-foreground text-sm">Unassigned</span>}</TableCell>
                        <TableCell>{b.studentCount}</TableCell>
                        <TableCell><Badge variant="secondary">{b.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <BatchMentorSelect batch={b} mentors={mentors} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateMentorDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateBatchDialog open={batchOpen} onOpenChange={setBatchOpen} mentors={mentors} />
      {assignTarget && (
        <AssignStudentsDialog
          mentor={assignTarget}
          batches={batches}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}

function BatchMentorSelect({ batch, mentors }: { batch: AdminBatch; mentors: AdminMentor[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: (mentorId: number) =>
      apiFetch(`/api/admin/batches/${batch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ mentorId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "batches"] });
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      toast({ title: "Mentor assigned to batch" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const eligible = mentors.filter((m) => m.careerTrack === batch.careerTrack);
  return (
    <Select value={batch.mentorId ? String(batch.mentorId) : undefined} onValueChange={(v) => mut.mutate(Number(v))}>
      <SelectTrigger className="h-8 w-[160px] ml-auto">
        <SelectValue placeholder="Assign mentor" />
      </SelectTrigger>
      <SelectContent>
        {eligible.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No {TRACK_LABELS[batch.careerTrack]} mentors</div>
        ) : (
          eligible.map((m) => (
            <SelectItem key={m.id} value={String(m.id)}>{m.fullName ?? m.email}</SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function CreateMentorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [careerTrack, setCareerTrack] = useState<string>("soc");
  const [specialization, setSpecialization] = useState("");

  const reset = () => { setEmail(""); setFullName(""); setPhone(""); setCareerTrack("soc"); setSpecialization(""); };

  const mut = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/mentors", {
        method: "POST",
        body: JSON.stringify({
          email, fullName, careerTrack,
          ...(phone ? { phone } : {}),
          ...(specialization ? { specialization } : {}),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      toast({ title: "Mentor created", description: `${fullName} can now log in via OTP.` });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Mentor</DialogTitle>
          <DialogDescription>
            The mentor signs in with the email below using the standard OTP flow. Role and track are set by you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="m-email">Email</Label>
            <Input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mentor@example.com" />
          </div>
          <div>
            <Label htmlFor="m-name">Full name</Label>
            <Input id="m-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label htmlFor="m-phone">Phone (optional)</Label>
            <Input id="m-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </div>
          <div>
            <Label>Track</Label>
            <Select value={careerTrack} onValueChange={setCareerTrack}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="m-spec">Specialization (optional)</Label>
            <Input id="m-spec" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Threat hunting" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!email || !fullName || mut.isPending}>
            {mut.isPending ? "Creating…" : "Create Mentor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateBatchDialog({ open, onOpenChange, mentors }: { open: boolean; onOpenChange: (v: boolean) => void; mentors: AdminMentor[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [careerTrack, setCareerTrack] = useState("soc");
  const [mentorId, setMentorId] = useState<string>("");
  const [status, setStatus] = useState("upcoming");

  const reset = () => { setName(""); setCode(""); setCareerTrack("soc"); setMentorId(""); setStatus("upcoming"); };

  const mut = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/batches", {
        method: "POST",
        body: JSON.stringify({
          name, careerTrack, status,
          ...(code ? { code } : {}),
          ...(mentorId ? { mentorId: Number(mentorId) } : {}),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "batches"] });
      toast({ title: "Batch created" });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const eligible = mentors.filter((m) => m.careerTrack === careerTrack);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Batch</DialogTitle>
          <DialogDescription>Group students into a cohort and assign a mentor of the same track.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="b-name">Batch name</Label>
            <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="SOC Batch Alpha" />
          </div>
          <div>
            <Label htmlFor="b-code">Code (optional)</Label>
            <Input id="b-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SOC-2026-A" />
          </div>
          <div>
            <Label>Track</Label>
            <Select value={careerTrack} onValueChange={(v) => { setCareerTrack(v); setMentorId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRACKS.map((t) => <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mentor (optional)</Label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger><SelectValue placeholder="Assign later" /></SelectTrigger>
              <SelectContent>
                {eligible.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No {TRACK_LABELS[careerTrack]} mentors</div>
                ) : eligible.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.fullName ?? m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["upcoming", "active", "completed", "archived"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!name || mut.isPending}>
            {mut.isPending ? "Creating…" : "Create Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignStudentsDialog({ mentor, batches, onClose }: { mentor: AdminMentor; batches: AdminBatch[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchId, setBatchId] = useState<string>("");
  const [isTrial, setIsTrial] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "students", "picker", debounced],
    queryFn: () =>
      apiFetch<{ students: SimpleStudent[] }>(
        `/api/admin/students${debounced ? `?search=${encodeURIComponent(debounced)}` : ""}`
      ),
  });
  const { data: assignedData } = useQuery({
    queryKey: ["admin", "mentor-students", mentor.id],
    queryFn: () =>
      apiFetch<{ students: { id: number; fullName: string | null; email: string }[] }>(
        `/api/admin/mentors/${mentor.id}/students`
      ),
  });

  const students = (data?.students ?? []).filter((s) => s.careerTrack === mentor.careerTrack);
  const assigned = assignedData?.students ?? [];
  const mentorBatches = batches.filter((b) => b.mentorId === mentor.id);

  const assignMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/mentors/${mentor.id}/students`, {
        method: "POST",
        body: JSON.stringify({
          studentIds: Array.from(selected),
          ...(batchId ? { batchId: Number(batchId) } : {}),
          isTrial,
        }),
      }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      qc.invalidateQueries({ queryKey: ["admin", "mentor-students", mentor.id] });
      toast({ title: `Assigned ${r?.assigned ?? selected.size} student(s)` });
      setSelected(new Set());
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const unassignMut = useMutation({
    mutationFn: (studentId: number) =>
      apiFetch(`/api/admin/mentors/${mentor.id}/students/${studentId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "mentors"] });
      qc.invalidateQueries({ queryKey: ["admin", "mentor-students", mentor.id] });
      toast({ title: "Student unassigned" });
    },
  });

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Students — {mentor.fullName ?? mentor.email}</DialogTitle>
          <DialogDescription>
            Only {TRACK_LABELS[mentor.careerTrack ?? ""] ?? mentor.careerTrack} students can be assigned to this mentor.
          </DialogDescription>
        </DialogHeader>

        {assigned.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Currently assigned ({assigned.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {assigned.map((s) => (
                <Badge key={s.id} variant="secondary" className="gap-1">
                  {s.fullName ?? s.email}
                  <button onClick={() => unassignMut.mutate(s.id)} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); setDebounced(search.trim()); }} className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : students.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No matching {TRACK_LABELS[mentor.careerTrack ?? ""]} students.</div>
          ) : students.map((s) => (
            <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
              <div>
                <div className="text-sm font-medium">{s.fullName ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{s.email}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Batch (optional)</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger><SelectValue placeholder="No batch" /></SelectTrigger>
              <SelectContent>
                {mentorBatches.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No batches for this mentor</div>
                ) : mentorBatches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch checked={isTrial} onCheckedChange={setIsTrial} id="trial" />
            <Label htmlFor="trial" className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Trial students</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={() => assignMut.mutate()} disabled={selected.size === 0 || assignMut.isPending}>
            {assignMut.isPending ? "Assigning…" : `Assign ${selected.size || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
