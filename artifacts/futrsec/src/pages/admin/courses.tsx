import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
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
import {
  BookOpen, Plus, Pencil, Layers, Trash2, Archive, Send,
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

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const LESSON_TYPES = ["video", "quiz", "article"] as const;

interface AdminTrack {
  id: number;
  name: string;
  slug: string;
  domain: string;
}
interface TracksResp {
  tracks: AdminTrack[];
}

interface Course {
  id: number;
  trackId: number;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  thumbnailUrl: string | null;
  xpReward: number;
  estimatedMinutes: number;
  order: number;
  lessonCount: number;
  isPublished: boolean;
  trackName: string | null;
  trackSlug: string | null;
}
interface CoursesResp {
  courses: Course[];
}

interface Lesson {
  id: number;
  moduleId: number;
  title: string;
  slug: string;
  order: number;
  type: string;
  durationMinutes: number | null;
  isPublished: boolean;
}
interface CourseDetailResp {
  course: Course;
  lessons: Lesson[];
}

const ALL = "__all__";

function trackDomainBadge(slug: string | null, name: string | null) {
  const domain = slug ? slug.split("-")[0] : "";
  const color = TRACK_COLORS[domain];
  if (!color) {
    return <span className="text-muted-foreground text-sm">{name ?? "—"}</span>;
  }
  return (
    <Badge style={{ backgroundColor: `${color}20`, color }} className="border-0">
      {TRACK_LABELS[domain] ?? name ?? domain}
    </Badge>
  );
}

interface CourseFormState {
  trackId: string;
  title: string;
  category: string;
  description: string;
  thumbnailUrl: string;
  estimatedMinutes: string;
  order: string;
}
const EMPTY_COURSE_FORM: CourseFormState = {
  trackId: "",
  title: "",
  category: "beginner",
  description: "",
  thumbnailUrl: "",
  estimatedMinutes: "",
  order: "",
};

interface LessonFormState {
  title: string;
  slug: string;
  order: string;
  type: string;
  durationMinutes: string;
}
const EMPTY_LESSON_FORM: LessonFormState = {
  title: "",
  slug: "",
  order: "",
  type: "video",
  durationMinutes: "",
};

export default function AdminCoursesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [trackFilter, setTrackFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const { data: tracksData } = useQuery({
    queryKey: ["/api/admin/tracks"],
    queryFn: () => apiFetch<TracksResp>("/api/admin/tracks"),
  });
  const tracks = tracksData?.tracks ?? [];

  const params = new URLSearchParams();
  if (trackFilter !== ALL) params.set("track", trackFilter);
  if (statusFilter !== ALL) params.set("status", statusFilter);
  const qs = params.toString();
  const listPath = `/api/admin/courses${qs ? `?${qs}` : ""}`;

  const { data, isLoading } = useQuery({
    queryKey: [listPath],
    queryFn: () => apiFetch<CoursesResp>(listPath),
  });
  const courses = data?.courses ?? [];

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
    queryClient.invalidateQueries({ queryKey: [listPath] });
  };

  // ---- Create / edit course ----
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(EMPTY_COURSE_FORM);

  const setCF = <K extends keyof CourseFormState>(k: K, v: CourseFormState[K]) =>
    setCourseForm((f) => ({ ...f, [k]: v }));

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ ...EMPTY_COURSE_FORM, trackId: tracks[0] ? String(tracks[0].id) : "" });
    setCourseDialogOpen(true);
  };
  const openEditCourse = (c: Course) => {
    setEditingCourse(c);
    setCourseForm({
      trackId: String(c.trackId),
      title: c.title,
      category: c.difficulty ?? c.category ?? "beginner",
      description: c.description ?? "",
      thumbnailUrl: c.thumbnailUrl ?? "",
      estimatedMinutes: c.estimatedMinutes ? String(c.estimatedMinutes) : "",
      order: String(c.order),
    });
    setCourseDialogOpen(true);
  };

  const createCourse = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      apiFetch("/api/admin/courses", { method: "POST", body: JSON.stringify(vars) }),
    onSuccess: () => {
      invalidateList();
      toast({ title: "Course created" });
      setCourseDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateCourse = useMutation({
    mutationFn: (vars: { id: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/courses/${vars.id}`, { method: "PATCH", body: JSON.stringify(vars.body) }),
    onSuccess: () => {
      invalidateList();
      toast({ title: "Course updated" });
      setCourseDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const saveCourse = () => {
    if (!courseForm.trackId) {
      toast({ title: "Select a track", variant: "destructive" });
      return;
    }
    if (courseForm.title.trim().length < 1) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const common = {
      title: courseForm.title.trim(),
      category: courseForm.category,
      description: courseForm.description.trim() || undefined,
      thumbnailUrl: courseForm.thumbnailUrl.trim() || undefined,
      estimatedMinutes: courseForm.estimatedMinutes ? Number(courseForm.estimatedMinutes) : undefined,
      order: courseForm.order ? Number(courseForm.order) : undefined,
    };
    if (editingCourse) {
      updateCourse.mutate({ id: editingCourse.id, body: common });
    } else {
      createCourse.mutate({ trackId: Number(courseForm.trackId), ...common });
    }
  };

  // ---- Publish / archive ----
  const togglePublish = useMutation({
    mutationFn: (vars: { id: number; publish: boolean }) =>
      apiFetch(`/api/admin/courses/${vars.id}/${vars.publish ? "publish" : "archive"}`, { method: "POST" }),
    onSuccess: (_d, vars) => {
      invalidateList();
      toast({ title: vars.publish ? "Course published" : "Course archived" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // ---- Manage lessons ----
  const [lessonsCourse, setLessonsCourse] = useState<Course | null>(null);
  const detailPath = lessonsCourse ? `/api/admin/courses/${lessonsCourse.id}` : null;
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: [detailPath ?? "course-detail-none"],
    queryFn: () => apiFetch<CourseDetailResp>(detailPath as string),
    enabled: !!detailPath,
  });
  const lessons = detail?.lessons ?? [];

  const invalidateDetail = () => {
    if (detailPath) queryClient.invalidateQueries({ queryKey: [detailPath] });
    invalidateList();
  };

  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(EMPTY_LESSON_FORM);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);

  const setLF = <K extends keyof LessonFormState>(k: K, v: LessonFormState[K]) =>
    setLessonForm((f) => ({ ...f, [k]: v }));

  const openAddLesson = () => {
    setEditingLesson(null);
    setLessonForm({ ...EMPTY_LESSON_FORM, order: String(lessons.length) });
    setLessonFormOpen(true);
  };
  const openEditLesson = (l: Lesson) => {
    setEditingLesson(l);
    setLessonForm({
      title: l.title,
      slug: l.slug,
      order: String(l.order),
      type: l.type,
      durationMinutes: l.durationMinutes != null ? String(l.durationMinutes) : "",
    });
    setLessonFormOpen(true);
  };

  const createLesson = useMutation({
    mutationFn: (vars: { courseId: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/courses/${vars.courseId}/lessons`, { method: "POST", body: JSON.stringify(vars.body) }),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Lesson added" });
      setLessonFormOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const updateLesson = useMutation({
    mutationFn: (vars: { lessonId: number; body: Record<string, unknown> }) =>
      apiFetch(`/api/admin/lessons/${vars.lessonId}`, { method: "PATCH", body: JSON.stringify(vars.body) }),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Lesson updated" });
      setLessonFormOpen(false);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const deleteLesson = useMutation({
    mutationFn: (lessonId: number) =>
      apiFetch(`/api/admin/lessons/${lessonId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateDetail();
      toast({ title: "Lesson deleted" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const saveLesson = () => {
    if (lessonForm.title.trim().length < 1) {
      toast({ title: "Lesson title is required", variant: "destructive" });
      return;
    }
    if (lessonForm.slug.trim().length < 1) {
      toast({ title: "Lesson slug is required", variant: "destructive" });
      return;
    }
    const body = {
      title: lessonForm.title.trim(),
      slug: lessonForm.slug.trim(),
      order: lessonForm.order ? Number(lessonForm.order) : 0,
      type: lessonForm.type,
      durationMinutes: lessonForm.durationMinutes ? Number(lessonForm.durationMinutes) : undefined,
    };
    if (editingLesson) {
      updateLesson.mutate({ lessonId: editingLesson.id, body });
    } else if (lessonsCourse) {
      createLesson.mutate({ courseId: lessonsCourse.id, body });
    }
  };

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Course CMS"
        subtitle="Create and manage learning modules and their lessons."
        actions={
          <Button onClick={openCreateCourse}>
            <Plus className="h-4 w-4 mr-1.5" /> New Course
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-56">
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger><SelectValue placeholder="All tracks" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tracks</SelectItem>
              {tracks.map((t) => (
                <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first learning module to start building the curriculum."
          action={<Button onClick={openCreateCourse}><Plus className="h-4 w-4 mr-1.5" /> New Course</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{trackDomainBadge(c.trackSlug, c.trackName)}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {c.difficulty ?? c.category ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.lessonCount}</TableCell>
                    <TableCell>
                      <Badge variant={c.isPublished ? "secondary" : "outline"}>
                        {c.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEditCourse(c)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePublish.mutate({ id: c.id, publish: !c.isPublished })}
                          disabled={togglePublish.isPending}
                        >
                          {c.isPublished ? (
                            <><Archive className="h-3.5 w-3.5 mr-1" /> Archive</>
                          ) : (
                            <><Send className="h-3.5 w-3.5 mr-1" /> Publish</>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setLessonsCourse(c)}>
                          <Layers className="h-3.5 w-3.5 mr-1" /> Lessons
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

      {/* Create / edit course dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "New Course"}</DialogTitle>
            <DialogDescription>
              {editingCourse
                ? "Update this learning module's details."
                : "Create a new learning module within a track."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Track</Label>
              <Select
                value={courseForm.trackId}
                onValueChange={(v) => setCF("trackId", v)}
                disabled={!!editingCourse}
              >
                <SelectTrigger><SelectValue placeholder="Select a track" /></SelectTrigger>
                <SelectContent>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="course-title">Title</Label>
              <Input
                id="course-title"
                value={courseForm.title}
                onChange={(e) => setCF("title", e.target.value)}
                placeholder="Introduction to SIEM"
              />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={courseForm.category} onValueChange={(v) => setCF("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="course-desc">Description</Label>
              <Textarea
                id="course-desc"
                value={courseForm.description}
                onChange={(e) => setCF("description", e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="course-thumb">Thumbnail URL</Label>
              <Input
                id="course-thumb"
                value={courseForm.thumbnailUrl}
                onChange={(e) => setCF("thumbnailUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="course-mins">Estimated Minutes</Label>
                <Input
                  id="course-mins"
                  type="number"
                  min={1}
                  value={courseForm.estimatedMinutes}
                  onChange={(e) => setCF("estimatedMinutes", e.target.value)}
                  placeholder="60"
                />
              </div>
              <div>
                <Label htmlFor="course-order">Order</Label>
                <Input
                  id="course-order"
                  type="number"
                  min={0}
                  value={courseForm.order}
                  onChange={(e) => setCF("order", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCourse} disabled={createCourse.isPending || updateCourse.isPending}>
              {createCourse.isPending || updateCourse.isPending
                ? "Saving…"
                : editingCourse ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage lessons dialog */}
      <Dialog open={!!lessonsCourse} onOpenChange={(open) => { if (!open) { setLessonsCourse(null); setLessonFormOpen(false); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Lessons</DialogTitle>
            <DialogDescription>{lessonsCourse?.title}</DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openAddLesson}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Lesson
              </Button>
            </div>

            {detailLoading ? (
              <CardSkeleton rows={4} />
            ) : lessons.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No lessons yet"
                description="Add lessons to build out this course."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mins</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground">{l.order}</TableCell>
                      <TableCell className="font-medium">{l.title}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{l.type}</TableCell>
                      <TableCell className="text-muted-foreground">{l.durationMinutes ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openEditLesson(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteLesson.mutate(l.id)}
                            disabled={deleteLesson.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {lessonFormOpen && (
              <div className="mt-5 border rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold">
                  {editingLesson ? "Edit Lesson" : "New Lesson"}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="lesson-title">Title</Label>
                    <Input
                      id="lesson-title"
                      value={lessonForm.title}
                      onChange={(e) => setLF("title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lesson-slug">Slug</Label>
                    <Input
                      id="lesson-slug"
                      value={lessonForm.slug}
                      onChange={(e) => setLF("slug", e.target.value)}
                      placeholder="intro-to-siem"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lesson-order">Order</Label>
                    <Input
                      id="lesson-order"
                      type="number"
                      min={0}
                      value={lessonForm.order}
                      onChange={(e) => setLF("order", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={lessonForm.type} onValueChange={(v) => setLF("type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LESSON_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lesson-mins">Duration (mins)</Label>
                    <Input
                      id="lesson-mins"
                      type="number"
                      min={0}
                      value={lessonForm.durationMinutes}
                      onChange={(e) => setLF("durationMinutes", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setLessonFormOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={saveLesson}
                    disabled={createLesson.isPending || updateLesson.isPending}
                  >
                    {createLesson.isPending || updateLesson.isPending
                      ? "Saving…"
                      : editingLesson ? "Save Lesson" : "Add Lesson"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
