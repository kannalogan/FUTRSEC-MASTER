import { useState } from "react";
import {
  useCampusReports, useDriveRegistrations,
  TRACK_LABELS,
  type CampusReport, type EnrichedRegistration,
} from "@/lib/campus-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import {
  Building, Briefcase, Users, ListChecks,
} from "lucide-react";

export default function CampusTpoPage() {
  const { data, isLoading } = useCampusReports();
  const reports = data?.reports ?? [];

  const [viewDrive, setViewDrive] = useState<CampusReport["drive"] | null>(null);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Building}
        title="Campus Drives"
        subtitle="Drive registrations & placement reports"
      />

      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No drive activity"
          description="None of your students have registered for campus drives yet."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drive</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead className="text-center">Registered</TableHead>
                  <TableHead className="text-center">Attended</TableHead>
                  <TableHead className="text-center">Shortlisted</TableHead>
                  <TableHead className="text-center">Selected</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.drive.id}>
                    <TableCell>
                      <div className="font-medium">{r.drive.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> {r.drive.companyName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TRACK_LABELS[r.drive.careerTrack] ?? r.drive.careerTrack}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{r.registered}</TableCell>
                    <TableCell className="text-center">{r.attended}</TableCell>
                    <TableCell className="text-center">{r.shortlisted}</TableCell>
                    <TableCell className="text-center text-emerald-600 font-medium">{r.selected}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{r.rejected}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setViewDrive(r.drive)}>
                        <ListChecks className="h-3.5 w-3.5 mr-1.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RegistrationsDialog drive={viewDrive} onClose={() => setViewDrive(null)} />
    </div>
  );
}

function RegistrationsDialog({
  drive, onClose,
}: {
  drive: CampusReport["drive"] | null;
  onClose: () => void;
}) {
  const driveId = drive?.id ?? 0;
  const { data, isLoading } = useDriveRegistrations(driveId, !!drive);
  const regs = data?.all ?? [];

  return (
    <Dialog open={!!drive} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrations — {drive?.name}</DialogTitle>
          <DialogDescription>Students from your institution registered for this drive.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6"><CardSkeleton rows={4} /></div>
        ) : regs.length === 0 ? (
          <EmptyState icon={Users} title="No registrations" description="No mapped students registered for this drive." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Attended</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regs.map((r: EnrichedRegistration) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.student?.fullName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.student?.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-center">{r.attended ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.result ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
