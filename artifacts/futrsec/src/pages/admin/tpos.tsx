import { useState } from "react";
import { useAdminTpos, useReviewTpo, type AdminTpo } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ShieldCheck, Check, X } from "lucide-react";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

export default function AdminTposPage() {
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useAdminTpos(status === "all" ? undefined : status);
  const review = useReviewTpo();
  const { toast } = useToast();

  const [rejectTarget, setRejectTarget] = useState<AdminTpo | null>(null);
  const [reason, setReason] = useState("");

  const tpos = data?.tpos ?? [];

  const approve = (t: AdminTpo) => {
    review.mutate(
      { userId: t.userId, decision: "approve" },
      {
        onSuccess: () => toast({ title: "TPO approved", description: t.fullName ?? t.email ?? "" }),
        onError: (e) => toast({ title: "Failed to approve", description: (e as Error).message, variant: "destructive" }),
      },
    );
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    review.mutate(
      { userId: rejectTarget.userId, decision: "reject", reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: "TPO rejected", description: rejectTarget.fullName ?? rejectTarget.email ?? "" });
          setRejectTarget(null);
          setReason("");
        },
        onError: (e) => toast({ title: "Failed to reject", description: (e as Error).message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={ShieldCheck}
        title="TPO Management"
        subtitle="Review and approve Training & Placement Officer registrations."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={status === tab.value ? "default" : "outline"}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : tpos.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No TPOs found" description="No TPOs match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tpos.map((t) => (
                  <TableRow key={t.userId}>
                    <TableCell className="font-medium">{t.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.email ?? "—"}</TableCell>
                    <TableCell>{t.institution ?? "—"}</TableCell>
                    <TableCell>{t.designation ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(t.approvalStatus)} className="capitalize">
                        {t.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {t.createdAt ? format(new Date(t.createdAt), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={t.approvalStatus === "approved" || review.isPending}
                          onClick={() => approve(t)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={t.approvalStatus === "rejected" || review.isPending}
                          onClick={() => { setRejectTarget(t); setReason(""); }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject TPO</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting{" "}
              <strong>{rejectTarget?.fullName ?? rejectTarget?.email}</strong>. This will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="reject-reason">Rejection reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Could not verify institution details."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejectTarget(null); setReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={review.isPending}>
              {review.isPending ? "Rejecting…" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
