import { useState } from "react";
import {
  useMentorBroadcasts, useCreateBroadcast, useUpdateBroadcast,
} from "@/lib/mentor-api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Send, Archive, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  archived: "bg-muted/50 text-muted-foreground border-border/50",
};

export default function MentorBroadcastsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useMentorBroadcasts();
  const createMut = useCreateBroadcast();
  const updateMut = useUpdateBroadcast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const broadcasts = data?.broadcasts ?? [];

  const submit = (publish: boolean) => {
    createMut.mutate(
      { title, content, publish },
      {
        onSuccess: () => {
          toast({ title: publish ? "Broadcast published to cohort" : "Draft saved successfully" });
          setTitle(""); setContent(""); setOpen(false);
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  const setStatus = (id: number, status: string) => {
    updateMut.mutate({ id, status }, {
      onSuccess: () => toast({ title: `Broadcast marked as ${status}` }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader
          icon={Megaphone}
          title="Broadcast Notes"
          subtitle="Send announcements, updates, and resources to your assigned students."
          actions={<Button onClick={() => setOpen(true)} className="rounded-full px-6 font-semibold"><Plus className="h-4 w-4 mr-2" /> New Broadcast</Button>}
        />
      </motion.div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2"><CardSkeleton rows={4} /><CardSkeleton rows={4} /></div>
      ) : broadcasts.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState
            icon={Megaphone}
            title="No active broadcasts"
            description="Create your first announcement to keep your cohort informed."
            action={<Button onClick={() => setOpen(true)} className="mt-4"><Plus className="h-4 w-4 mr-2" /> Compose Broadcast</Button>}
          />
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {broadcasts.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }}>
              <Card className="glass-card flex flex-col h-full border-border/60 hover-lift">
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <CardTitle className="text-lg leading-tight font-bold">{b.title}</CardTitle>
                    <Badge variant="outline" className={`shrink-0 uppercase tracking-wider text-xs py-0.5 px-2 ${STATUS_STYLE[b.status] ?? STATUS_STYLE.draft}`}>
                      {b.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 
                      {b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : new Date(b.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> All Students</div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-1">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/50 font-sans">
                    {b.content}
                  </p>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex justify-end gap-2 border-t border-border/50 mt-4">
                  {b.status !== "published" && (
                    <Button size="sm" onClick={() => setStatus(b.id, "published")} disabled={updateMut.isPending} className="font-semibold">
                      <Send className="h-4 w-4 mr-2" /> Publish Now
                    </Button>
                  )}
                  {b.status !== "archived" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "archived")} disabled={updateMut.isPending}>
                      <Archive className="h-4 w-4 mr-2" /> Archive
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setTitle(""); setContent(""); } setOpen(v); }}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-border/60 glass-card">
          <div className="bg-muted/50 p-6 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading">Compose Broadcast</DialogTitle>
              <DialogDescription>This message will be sent to all students in your assigned cohorts.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bc-title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Subject Line</Label>
              <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Weekly Sync Update & Resources" className="h-12 text-base font-medium" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bc-content" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Message Body</Label>
              <Textarea id="bc-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your announcement here. Formatting is supported." rows={8} className="resize-none text-base" />
            </div>
          </div>
          <div className="bg-muted/30 p-6 border-t border-border/50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => submit(false)} disabled={!title || !content || createMut.isPending} className="font-semibold">Save as Draft</Button>
            <Button onClick={() => submit(true)} disabled={!title || !content || createMut.isPending} className="font-semibold px-6">
              {createMut.isPending ? "Sending..." : <><Send className="h-4 w-4 mr-2" /> Publish Broadcast</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
