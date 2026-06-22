import {
  useMyInvites, useMySchedule, useRespondInvite,
  ROUND_TYPE_LABELS,
  type StudentInvite, type StudentSchedule,
} from "@/lib/placement-drives-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Briefcase, Building2, CalendarDays, MapPin, Video, Check, X, Clock, Award,
} from "lucide-react";

const INVITE_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  declined: "bg-destructive/15 text-destructive border-destructive/30",
};

const RESULT_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  pass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  fail: "bg-destructive/15 text-destructive border-destructive/30",
  selected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  offer: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  joined: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border-emerald-600/40",
};

function fmtDate(value: string | null): string {
  if (!value) return "Date TBD";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "Date TBD" : format(d, "dd MMM yyyy, h:mm a");
}

export default function StudentMyInterviews() {
  const { toast } = useToast();
  const { data: invitesData, isLoading: invitesLoading } = useMyInvites();
  const { data: scheduleData, isLoading: scheduleLoading } = useMySchedule();
  const respond = useRespondInvite();

  const invites = invitesData?.invites ?? [];
  const schedules = scheduleData?.schedules ?? [];

  const pending = invites.filter((i) => i.status === "pending");
  const responded = invites.filter((i) => i.status !== "pending");

  const handleRespond = (inv: StudentInvite, action: "accept" | "decline") => {
    respond.mutate(
      { inviteId: inv.id, action },
      {
        onSuccess: () => toast({ title: action === "accept" ? "Invite accepted" : "Invite declined" }),
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        icon={Briefcase}
        title="My Interviews"
        subtitle="Respond to placement invitations and track your scheduled interviews."
      />

      {/* Pending invites */}
      <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" /> Placement Invitations
      </h2>

      {invitesLoading ? (
        <div className="grid sm:grid-cols-2 gap-4 mb-8"><CardSkeleton rows={3} /><CardSkeleton rows={3} /></div>
      ) : invites.length === 0 ? (
        <Card className="mb-8"><CardContent className="p-8 text-center text-sm text-muted-foreground">
          You have no placement invitations yet. Keep your profile and FTS score up to date to qualify for company drives.
        </CardContent></Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {pending.map((inv) => (
                <InviteCard key={inv.id} invite={inv} onRespond={handleRespond} pending={respond.isPending} />
              ))}
            </div>
          )}
          {responded.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {responded.map((inv) => (
                <InviteCard key={inv.id} invite={inv} onRespond={handleRespond} pending={respond.isPending} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Scheduled interviews */}
      <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" /> Scheduled Interviews
      </h2>

      {scheduleLoading ? (
        <CardSkeleton rows={3} />
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No interviews scheduled"
          description="Once you accept an invitation and the TPO books your slot, your interviews will appear here."
        />
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => <ScheduleRow key={s.id} schedule={s} />)}
        </div>
      )}
    </div>
  );
}

function InviteCard({
  invite, onRespond, pending,
}: {
  invite: StudentInvite;
  onRespond: (inv: StudentInvite, action: "accept" | "decline") => void;
  pending: boolean;
}) {
  const drive = invite.drive;
  return (
    <Card className="flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{drive?.companyName ?? "Company"}</h3>
            <div className="text-sm text-muted-foreground truncate">{drive?.role ?? ""}</div>
          </div>
          <Badge variant="outline" className={`capitalize shrink-0 ${INVITE_STATUS_BADGE[invite.status] ?? ""}`}>{invite.status}</Badge>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {drive?.packageDetails && <Badge variant="outline">{drive.packageDetails}</Badge>}
          {drive?.mode && <Badge variant="outline" className="capitalize">{drive.mode}</Badge>}
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {fmtDate(drive?.driveDate ?? null)}</div>
          <div className="flex items-center gap-1.5">
            {drive?.mode === "remote" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {drive?.mode === "remote" ? (drive?.meetingUrl || "Online") : (drive?.venue || "Venue TBD")}
          </div>
          {invite.rounds.length > 0 && (
            <div className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {invite.rounds.length} round(s)</div>
          )}
        </div>

        {invite.status === "pending" ? (
          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/60">
            <Button size="sm" className="flex-1" disabled={pending} onClick={() => onRespond(invite, "accept")}>
              <Check className="h-4 w-4 mr-1.5" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive border-destructive/40" disabled={pending} onClick={() => onRespond(invite, "decline")}>
              <X className="h-4 w-4 mr-1.5" /> Decline
            </Button>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-border/60 text-xs text-muted-foreground">
            {invite.status === "accepted" ? "You accepted this invitation." : "You declined this invitation."}
            {invite.respondedAt && ` · ${format(new Date(invite.respondedAt), "dd MMM yyyy")}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleRow({ schedule }: { schedule: StudentSchedule }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">
              {schedule.drive?.companyName ?? "Company"} · {schedule.round ? (ROUND_TYPE_LABELS[schedule.round.type] ?? schedule.round.name) : "Round"}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(schedule.slotStart)}</span>
              {schedule.venue ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {schedule.venue}</span>
                : schedule.meetingUrl ? <a href={schedule.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Video className="h-3 w-3" /> Join</a>
                : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className={`capitalize ${RESULT_BADGE[schedule.result] ?? ""}`}>
            {schedule.result === "offer" || schedule.result === "joined" ? <Award className="h-3 w-3 mr-1" /> : null}
            {schedule.result}
          </Badge>
          {schedule.score != null && <span className="text-xs text-muted-foreground">Score {schedule.score}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
