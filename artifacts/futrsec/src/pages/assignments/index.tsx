import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ListTodo, Calendar, CheckCircle2, Upload, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface Submission {
  id: number;
  status: string;
  score: number | null;
}
interface Assignment {
  id: number;
  title: string;
  description: string;
  dueDate: string | null;
  maxScore: number;
  submission: Submission | null;
}

export default function AssignmentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [active, setActive] = useState<Assignment | null>(null);
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/assignments"],
    queryFn: () => apiFetch<Assignment[]>("/api/assignments"),
  });

  const submit = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/assignments/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ content, submissionUrl: url }),
      }),
    onSuccess: () => {
      toast({ title: "Submitted", description: "Your assignment has been submitted." });
      qc.invalidateQueries({ queryKey: ["/api/assignments"] });
      setActive(null);
      setContent("");
      setUrl("");
    },
    onError: () => toast({ title: "Error", description: "Could not submit.", variant: "destructive" }),
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PageHeader icon={ListTodo} title="Assignments" subtitle="Complete and submit your track assignments" />

      {isLoading ? (
        <GridSkeleton cols={2} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No assignments yet"
          description="Assignments for your track will appear here once published."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {data.map((a, idx) => {
            const submitted = !!a.submission;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className="bg-card border-border/60 h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm text-foreground leading-tight">{a.title}</h3>
                      {submitted ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {a.submission?.status}
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] shrink-0">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{a.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {a.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(a.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {a.maxScore} pts
                      </span>
                      {submitted && a.submission?.score != null && (
                        <span className="font-medium text-emerald-600">Scored {a.submission.score}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={submitted ? "outline" : "default"}
                      className="w-full"
                      onClick={() => setActive(a)}
                      disabled={submitted}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {submitted ? "Submitted" : "Submit Work"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
            <DialogDescription>Submit your work for this assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Describe your solution or paste your answer…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
            <Input
              placeholder="Submission URL (GitHub, Drive, etc.) — optional"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => active && submit.mutate(active.id)}
              disabled={submit.isPending || (!content && !url)}
            >
              {submit.isPending ? "Submitting…" : "Submit Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
