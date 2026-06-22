import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useTicket,
  useCreateReply,
  useUpdateTicketStatus,
  TICKET_STATUSES,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
  priorityBadgeClass,
  type TicketStatus,
} from "@/lib/support-api";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft, Send, Paperclip, MessageSquare, LifeBuoy,
} from "lucide-react";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy, h:mm a");
}

function initials(name: string | null): string {
  if (!name) return "U";
  return name.trim()[0]?.toUpperCase() ?? "U";
}

export default function SupportTicketDetail() {
  const { uid = "" } = useParams<{ uid: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, isLoading, isError } = useTicket(uid);
  const replyMut = useCreateReply(uid);
  const statusMut = useUpdateTicketStatus(uid);

  const [message, setMessage] = useState("");

  const ticket = data?.ticket;
  const replies = data?.replies ?? [];

  const role = user?.role ?? null;
  const isAdmin = role === "admin";
  const isAssignee = !!ticket && !!user && ticket.assignedTo === user.id;
  const canChangeStatus = isAdmin || isAssignee;

  const sendReply = () => {
    if (message.trim().length < 1) return;
    replyMut.mutate(
      { message: message.trim() },
      {
        onSuccess: () => {
          setMessage("");
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  const changeStatus = (status: string) => {
    statusMut.mutate(status as TicketStatus, {
      onSuccess: () => toast({ title: "Status updated", description: STATUS_LABELS[status] ?? status }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const backHref = isAdmin ? "/admin/support" : "/support";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href={backHref}>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to tickets
        </Button>
      </Link>

      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : isError || !ticket ? (
        <EmptyState
          icon={LifeBuoy}
          title="Ticket not available"
          description="This ticket may not exist or you don't have access to it."
          action={<Link href={backHref}><Button variant="outline">Back to tickets</Button></Link>}
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`capitalize ${statusBadgeClass(ticket.status)}`}>
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Badge>
                  <Badge variant="outline" className={`capitalize ${priorityBadgeClass(ticket.priority)}`}>
                    {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                  </Badge>
                </div>
                {canChangeStatus && (
                  <Select value={ticket.status} onValueChange={changeStatus}>
                    <SelectTrigger className="w-[150px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <h1 className="text-xl font-heading font-bold text-foreground mb-2">{ticket.subject}</h1>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>

              {ticket.attachments.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {ticket.attachments.map((a, i) => (
                    <a
                      key={i}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground flex-wrap">
                <span>From: {ticket.createdByName ?? ticket.createdByEmail ?? "User"}</span>
                <span>Opened: {fmtDate(ticket.createdAt)}</span>
                {ticket.assignedToName && <span>Assigned: {ticket.assignedToName}</span>}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Conversation ({replies.length})
          </div>

          <div className="space-y-3 mb-5">
            {replies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No replies yet. Start the conversation below.</p>
            ) : (
              replies.map((r) => {
                const mine = !!user && r.authorId === user.id;
                return (
                  <div key={r.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                      <span className="text-sm font-bold text-primary">{initials(r.authorName)}</span>
                    </div>
                    <div className={`flex-1 min-w-0 ${mine ? "items-end" : ""}`}>
                      <div className={`flex items-center gap-2 mb-1 text-xs text-muted-foreground ${mine ? "justify-end" : ""}`}>
                        <span className="font-medium text-foreground">{r.authorName ?? "User"}</span>
                        <span>{fmtDate(r.createdAt)}</span>
                      </div>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${mine ? "bg-primary/10 text-foreground" : "bg-card border border-border/60 text-foreground"}`}>
                        {r.message}
                        {r.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {r.attachments.map((a, i) => (
                              <a
                                key={i}
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                <Paperclip className="h-3 w-3 shrink-0" />
                                <span className="truncate">{a.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {ticket.status === "closed" ? (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                This ticket is closed. Reopen it (change status) to continue the conversation.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Write a reply…"
                  className="mb-3"
                />
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={replyMut.isPending || !message.trim()}>
                    <Send className="h-4 w-4 mr-1.5" />
                    {replyMut.isPending ? "Sending…" : "Send Reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
