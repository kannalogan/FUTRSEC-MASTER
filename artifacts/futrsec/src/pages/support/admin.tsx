import { useState } from "react";
import { Link } from "wouter";
import {
  useTickets,
  useTicketStats,
  useAssignees,
  useAssignTicket,
  useUpdateTicketStatus,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
  priorityBadgeClass,
  type TicketFilters,
  type TicketListItem,
} from "@/lib/support-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  LifeBuoy, MessageSquare, ArrowRight, Clock, Ticket, CheckCircle2, Timer,
} from "lucide-react";

const ALL = "__all__";
const UNASSIGNED = "__unassigned__";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy, h:mm a");
}

function StatCard({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketRow({ ticket, assignees }: {
  ticket: TicketListItem;
  assignees: { id: number; fullName: string | null; email: string | null; role: string }[];
}) {
  const { toast } = useToast();
  const assignMut = useAssignTicket(ticket.ticketUid);
  const statusMut = useUpdateTicketStatus(ticket.ticketUid);

  const onAssign = (v: string) => {
    const assignedTo = v === UNASSIGNED ? null : Number(v);
    assignMut.mutate(assignedTo, {
      onSuccess: () => toast({ title: "Assignment updated" }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  const onStatus = (v: string) => {
    statusMut.mutate(v as (typeof TICKET_STATUSES)[number], {
      onSuccess: () => toast({ title: "Status updated" }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
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
            <Link href={`/support/${ticket.ticketUid}`}>
              <h3 className="font-semibold text-foreground truncate hover:text-primary cursor-pointer">{ticket.subject}</h3>
            </Link>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>By: {ticket.createdByName ?? ticket.createdByEmail ?? "User"}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {fmtDate(ticket.updatedAt)}</span>
              <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {ticket.replyCount}</span>
            </div>
          </div>
          <Link href={`/support/${ticket.ticketUid}`}>
            <Button variant="ghost" size="sm">
              Open <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-border/60">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Assignee</label>
            <Select value={ticket.assignedTo != null ? String(ticket.assignedTo) : UNASSIGNED} onValueChange={onAssign}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.fullName ?? a.email ?? `#${a.id}`} ({a.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <Select value={ticket.status} onValueChange={onStatus}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TICKET_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSupportQueue() {
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [assignedTo, setAssignedTo] = useState(ALL);
  const [search, setSearch] = useState("");

  const filters: TicketFilters = {
    status: status === ALL ? undefined : status,
    priority: priority === ALL ? undefined : priority,
    category: category === ALL ? undefined : category,
    assignedTo: assignedTo === ALL ? undefined : Number(assignedTo),
    q: search.trim() || undefined,
  };

  const { data, isLoading } = useTickets(filters);
  const { data: stats } = useTicketStats();
  const { data: assigneeData } = useAssignees();

  const tickets = data?.tickets ?? [];
  const assignees = assigneeData?.assignees ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Ticket}
        title="Support Tickets"
        subtitle="Triage, assign and resolve support requests across the platform."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Ticket} label="Total tickets" value={stats?.total ?? "—"} />
        <StatCard icon={LifeBuoy} label="Open" value={stats?.open ?? "—"} />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats?.resolved ?? "—"} />
        <StatCard
          icon={Timer}
          label="Avg resolution (hrs)"
          value={stats?.avgResolutionHours != null ? stats.avgResolutionHours : "—"}
        />
      </div>

      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject…"
              className="h-9"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All priorities</SelectItem>
                {TICKET_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {TICKET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All assignees</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.fullName ?? a.email ?? `#${a.id}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <GridSkeleton cols={1} rows={4} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets match your filters"
          description="Try adjusting or clearing the filters to see more tickets."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} assignees={assignees} />
          ))}
        </div>
      )}
    </div>
  );
}
