import { useState } from "react";
import {
  useMentorBroadcasts, useCreateBroadcast, useUpdateBroadcast,
} from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
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
import { Megaphone, Plus, Send, Archive } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground/70",
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
          toast({ title: publish ? "Broadcast published" : "Draft saved" });
          setTitle(""); setContent(""); setOpen(false);
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  const setStatus = (id: number, status: string) => {
    updateMut.mutate({ id, status }, {
      onSuccess: () => toast({ title: `Broadcast ${status}` }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        icon={Megaphone}
        title="Broadcast Notes"
        subtitle="Send announcements to your assigned students."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Broadcast</Button>}
      />

      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : broadcasts.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No broadcasts yet"
          description="Create your first announcement for your cohort."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Broadcast</Button>}
        />
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-foreground">{b.title}</h3>
                  <Badge className={`border-0 ${STATUS_STYLE[b.status] ?? STATUS_STYLE.draft}`}>{b.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{b.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {b.publishedAt ? `Published ${new Date(b.publishedAt).toLocaleDateString()}` : `Created ${new Date(b.createdAt).toLocaleDateString()}`}
                  </span>
                  <div className="flex gap-2">
                    {b.status !== "published" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "published")} disabled={updateMut.isPending}>
                        <Send className="h-3.5 w-3.5 mr-1.5" /> Publish
                      </Button>
                    )}
                    {b.status !== "archived" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "archived")} disabled={updateMut.isPending}>
                        <Archive className="h-3.5 w-3.5 mr-1.5" /> Archive
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setTitle(""); setContent(""); } setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Broadcast</DialogTitle>
            <DialogDescription>Reaches all students assigned to you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="bc-title">Title</Label>
              <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly update" />
            </div>
            <div>
              <Label htmlFor="bc-content">Message</Label>
              <Textarea id="bc-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your announcement…" rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => submit(false)} disabled={!title || !content || createMut.isPending}>Save Draft</Button>
            <Button onClick={() => submit(true)} disabled={!title || !content || createMut.isPending}>
              {createMut.isPending ? "Sending…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
