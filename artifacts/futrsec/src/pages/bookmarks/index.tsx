import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { Bookmark, Trash2, Video, FileText, Brain, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  video: Video, article: FileText, quiz: Brain, pdf: FileText, default: BookOpen,
};
const TYPE_COLORS: Record<string, string> = {
  video: "#2563EB", article: "#10B981", quiz: "#F97316", pdf: "#06B6D4",
};

export default function BookmarksPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => apiFetch<any[]>("/api/bookmarks"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bookmarks/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookmarks"] }); toast({ title: "Bookmark removed" }); },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Bookmarks" subtitle={bookmarks.length > 0 ? `${bookmarks.length} saved items` : "Your saved lessons"} icon={Bookmark} />

      {isLoading ? (
        <GridSkeleton cols={2} rows={3} />
      ) : bookmarks.length === 0 ? (
        <EmptyState icon={Bookmark} title="No bookmarks yet"
          description="While studying, click the bookmark icon on any lesson to save it here for quick access." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map((b: any, i: number) => {
            const Icon = TYPE_ICONS[b.lessonType] ?? TYPE_ICONS.default;
            const color = TYPE_COLORS[b.lessonType] ?? "#2563EB";
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="bg-white border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4 group">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{b.lessonTitle ?? "Lesson"}</p>
                    {b.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.note}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">{b.lessonType ?? "lesson"}</Badge>
                      {b.lessonDuration && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{b.lessonDuration}m</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Saved {new Date(b.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={() => remove.mutate(b.id)} disabled={remove.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
