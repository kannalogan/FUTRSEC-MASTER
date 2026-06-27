import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Layers, Users, Info } from "lucide-react";

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

interface AdminTrack {
  id: number;
  name: string;
  slug: string;
  domain: string;
  description: string | null;
  difficulty: string;
  durationWeeks: number;
  totalModules: number;
  enrolledCount: number;
  accentColor: string;
  isActive: boolean;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TracksResponse {
  tracks: AdminTrack[];
}

interface FormState {
  name: string;
  description: string;
  difficulty: Difficulty;
  accentColor: string;
  isActive: boolean;
}

export default function AdminTracksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/tracks"],
    queryFn: () => apiFetch<TracksResponse>("/api/admin/tracks"),
  });

  const tracks = data?.tracks ?? [];

  const [target, setTarget] = useState<AdminTrack | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    difficulty: "beginner",
    accentColor: "#2563EB",
    isActive: true,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; body: Partial<FormState> }) =>
      apiFetch(`/api/admin/tracks/${vars.id}`, {
        method: "PATCH",
        body: JSON.stringify(vars.body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({ title: "Track updated" });
      setTarget(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openEdit = (t: AdminTrack) => {
    setTarget(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      difficulty: (DIFFICULTIES.includes(t.difficulty as Difficulty)
        ? t.difficulty
        : "beginner") as Difficulty,
      accentColor: t.accentColor,
      isActive: t.isActive,
    });
  };

  const toggleActive = (t: AdminTrack, isActive: boolean) =>
    updateMut.mutate({ id: t.id, body: { isActive } });

  const save = () => {
    if (!target) return;
    if (form.name.trim().length < 1) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    updateMut.mutate({
      id: target.id,
      body: {
        name: form.name.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        accentColor: form.accentColor,
        isActive: form.isActive,
      },
    });
  };

  return (
    <div>
      <PageHeader
        icon={Layers}
        title="Track Management"
        subtitle="Edit track definitions (metadata only). This does not change any student's career track."
      />

      <div className="flex items-start gap-2 rounded-lg bg-info/10 border border-info/30 p-3 text-sm text-info mb-6">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          These are <strong>track definitions</strong> — their name, description, difficulty, color and
          availability. Student track assignments are managed separately and are not editable here.
        </span>
      </div>

      {isLoading ? (
        <GridSkeleton cols={3} rows={1} />
      ) : tracks.length === 0 ? (
        <EmptyState icon={Layers} title="No tracks found" description="No tracks have been defined yet." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: t.accentColor }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-heading font-bold text-base leading-tight">{t.name}</h3>
                    <Badge
                      className="border-0 mt-1.5"
                      style={{ backgroundColor: `${t.accentColor}20`, color: t.accentColor }}
                    >
                      {t.domain}
                    </Badge>
                  </div>
                  <Switch
                    checked={t.isActive}
                    onCheckedChange={(v) => toggleActive(t, v)}
                    disabled={updateMut.isPending}
                  />
                </div>

                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>
                )}

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {t.studentCount} students
                  </span>
                  <Badge variant="outline" className="capitalize">{t.difficulty}</Badge>
                </div>

                <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(t)}>
                  Edit Track
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
            <DialogDescription>
              Update this track's definition. This does not reassign any students.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="t-desc">Description</Label>
              <Textarea id="t-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="t-color">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="t-color"
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="h-9 w-12 p-1"
                  />
                  <Input
                    value={form.accentColor}
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="t-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              <Label htmlFor="t-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={save} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
