import { useState } from "react";
import { Link } from "wouter";
import {
  useTickets,
  useCreateTicket,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
  priorityBadgeClass,
  type CreateTicketBody,
  type TicketAttachment,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/support-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  LifeBuoy, Plus, MessageSquare, ArrowRight, Paperclip, Trash2, Clock,
} from "lucide-react";

interface FormState {
  category: string;
  priority: string;
  subject: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  category: "technical",
  priority: "medium",
  subject: "",
  description: "",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy, h:mm a");
}

export default function SupportPage() {
  const { toast } = useToast();
  const { data, isLoading } = useTickets();
  const createMut = useCreateTicket();

  const tickets = data?.tickets ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [attName, setAttName] = useState("");
  const [attUrl, setAttUrl] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setAttachments([]);
    setAttName("");
    setAttUrl("");
    setDialogOpen(true);
  };

  const addAttachment = () => {
    if (!attName.trim() || !attUrl.trim()) {
      toast({ title: "Both attachment name and URL are required", variant: "destructive" });
      return;
    }
    if (attachments.length >= 10) {
      toast({ title: "Maximum 10 attachments", variant: "destructive" });
      return;
    }
    setAttachments((a) => [...a, { name: attName.trim(), url: attUrl.trim() }]);
    setAttName("");
    setAttUrl("");
  };

  const removeAttachment = (idx: number) =>
    setAttachments((a) => a.filter((_, i) => i !== idx));

  const save = () => {
    if (form.subject.trim().length < 3) {
      toast({ title: "Subject must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (form.description.trim().length < 5) {
      toast({ title: "Description must be at least 5 characters", variant: "destructive" });
      return;
    }
    const body: CreateTicketBody = {
      category: form.category as TicketCategory,
      priority: form.priority as TicketPriority,
      subject: form.subject.trim(),
      description: form.description.trim(),
      attachments: attachments.length ? attachments : undefined,
    };
    createMut.mutate(body, {
      onSuccess: () => {
        toast({ title: "Ticket submitted", description: "Our team will respond soon." });
        setDialogOpen(false);
      },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        icon={LifeBuoy}
        title="Support"
        subtitle="Raise a ticket and track conversations with the FUTRSEC team."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Ticket
          </Button>
        }
      />

      {isLoading ? (
        <GridSkeleton cols={1} rows={3} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets yet"
          description="Create a ticket to get help from our support team. You'll see all your conversations here."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> New Ticket</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/support/${t.ticketUid}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge variant="outline" className={`capitalize ${statusBadgeClass(t.status)}`}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </Badge>
                        <Badge variant="outline" className={`capitalize ${priorityBadgeClass(t.priority)}`}>
                          {PRIORITY_LABELS[t.priority] ?? t.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{t.subject}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> {fmtDate(t.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" /> {t.replyCount} repl{t.replyCount === 1 ? "y" : "ies"}
                        </span>
                        {t.assignedToName && (
                          <span className="hidden sm:inline truncate">Assigned: {t.assignedToName}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>Describe your issue. Our team will follow up in this thread.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="t-subject">Subject</Label>
              <Input id="t-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Brief summary of your issue" />
            </div>
            <div>
              <Label htmlFor="t-desc">Description</Label>
              <Textarea id="t-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} placeholder="Describe your issue in detail…" />
            </div>

            <div>
              <Label>Attachment Links (optional)</Label>
              {attachments.length > 0 && (
                <div className="space-y-1.5 mb-2 mt-1.5">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-foreground">{a.name}</span>
                      <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2 mt-1.5">
                <Input value={attName} onChange={(e) => setAttName(e.target.value)} placeholder="Label" />
                <Input value={attUrl} onChange={(e) => setAttUrl(e.target.value)} placeholder="https://…" />
                <Button type="button" variant="outline" size="icon" onClick={addAttachment}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createMut.isPending}>
              {createMut.isPending ? "Submitting…" : "Submit Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
