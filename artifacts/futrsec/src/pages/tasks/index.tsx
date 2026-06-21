import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckCircle2, Circle, ListTodo, CheckSquare } from "lucide-react";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

interface Task {
  id: string;
  type: "assignment" | "checkpoint";
  title: string;
  description: string;
  dueDate: string | null;
  done: boolean;
  priority: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F97316",
  low: "#10B981",
};

export default function TasksPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const { data, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: () => apiFetch<Task[]>("/api/tasks"),
  });

  const filtered = (data ?? []).filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done,
  );
  const doneCount = data?.filter((t) => t.done).length ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader
        icon={FolderKanban}
        title="Tasks"
        subtitle="Everything on your plate, in one place"
        actions={
          data && data.length > 0 ? (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {doneCount} / {data.length} done
            </Badge>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-5">
        {(["all", "pending", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg capitalize transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <GridSkeleton cols={1} rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
          description="Tasks are generated from your assignments and checkpoints. Select a track to get started."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t, idx) => {
            const TypeIcon = t.type === "assignment" ? ListTodo : CheckSquare;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.03 }}
              >
                <Card className={`bg-white border-border/60 ${t.done ? "opacity-65" : ""}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    {t.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm text-foreground ${t.done ? "line-through" : ""}`}>
                        {t.title}
                      </h3>
                      {t.dueDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Due {new Date(t.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize gap-1">
                      <TypeIcon className="h-3 w-3" />
                      {t.type}
                    </Badge>
                    {!t.done && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: PRIORITY_COLORS[t.priority] ?? "#94a3b8" }}
                        title={`${t.priority} priority`}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
