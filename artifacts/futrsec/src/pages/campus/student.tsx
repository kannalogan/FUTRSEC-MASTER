import {
  useStudentDrives, useMyDriveRegistrations, useRegisterForDrive,
  TRACK_LABELS,
  type StudentDrive, type MyRegistration,
} from "@/lib/campus-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Building, Briefcase, CalendarDays, CheckCircle2, MapPin,
} from "lucide-react";

const STATUS_VARIANTS: Record<string, "secondary" | "outline" | "destructive"> = {
  registered: "secondary",
  shortlisted: "secondary",
  selected: "secondary",
  rejected: "destructive",
  withdrawn: "outline",
};

function fmtDate(value: string | null): string {
  if (!value) return "No deadline";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "No deadline" : format(d, "dd MMM yyyy");
}

function deadlinePassed(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

export default function CampusStudentPage() {
  const { toast } = useToast();
  const drivesQuery = useStudentDrives();
  const regsQuery = useMyDriveRegistrations();
  const registerMut = useRegisterForDrive();

  const drives = drivesQuery.data?.drives ?? [];
  const registrations = regsQuery.data?.registrations ?? [];

  const register = (drive: StudentDrive) => {
    registerMut.mutate(drive.id, {
      onSuccess: () => toast({ title: "Registered", description: `You're registered for ${drive.name}.` }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Building}
        title="Campus Drives"
        subtitle="Browse eligible drives & register"
      />

      <Tabs defaultValue="available">
        <TabsList className="mb-4">
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="mine">My Registrations</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          {drivesQuery.isLoading ? (
            <GridSkeleton cols={2} rows={1} />
          ) : drives.length === 0 ? (
            <EmptyState
              icon={Building}
              title="No eligible drives"
              description="There are no campus drives matching your track and eligibility right now."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {drives.map((d) => (
                <DriveCard
                  key={d.id}
                  drive={d}
                  onRegister={() => register(d)}
                  registering={registerMut.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {regsQuery.isLoading ? (
            <GridSkeleton cols={2} rows={1} />
          ) : registrations.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No registrations yet"
              description="Register for an eligible drive to see it here."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {registrations.map((r) => (
                <MyRegistrationCard key={r.id} reg={r} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DriveCard({
  drive, onRegister, registering,
}: {
  drive: StudentDrive;
  onRegister: () => void;
  registering: boolean;
}) {
  const closed = drive.status !== "open" || deadlinePassed(drive.deadline);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="font-semibold text-foreground">{drive.name}</h3>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> {drive.companyName}
            </div>
          </div>
          <Badge variant="outline" className="capitalize shrink-0">{drive.mode}</Badge>
        </div>

        {drive.eligibilityCriteria && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{drive.eligibilityCriteria}</p>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Deadline: {fmtDate(drive.deadline)}
          </div>
          {drive.packageDetails && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> {drive.packageDetails}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {TRACK_LABELS[drive.careerTrack] ?? drive.careerTrack}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60">
          {drive.registered ? (
            <Badge variant={STATUS_VARIANTS[drive.registration?.status ?? "registered"] ?? "secondary"} className="capitalize">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {drive.registration?.status ?? "Registered"}
            </Badge>
          ) : (
            <Button size="sm" onClick={onRegister} disabled={closed || registering}>
              {closed ? "Registration Closed" : registering ? "Registering…" : "Register"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MyRegistrationCard({ reg }: { reg: MyRegistration }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="font-semibold text-foreground">{reg.drive?.name ?? "Drive"}</h3>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> {reg.drive?.companyName ?? "—"}
            </div>
          </div>
          <Badge variant={STATUS_VARIANTS[reg.status] ?? "outline"} className="capitalize shrink-0">
            {reg.status}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground mt-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Registered: {fmtDate(reg.createdAt)}
          </div>
          {reg.attended && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Attended
            </div>
          )}
          {reg.result && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Result: {reg.result}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
