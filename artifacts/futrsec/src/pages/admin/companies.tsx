import { useState } from "react";
import { useAdminCompanies, useReviewCompany, type AdminCompany } from "@/lib/admin-api";
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
import { Building2, Check, X } from "lucide-react";

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

export default function AdminCompaniesPage() {
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useAdminCompanies(status === "all" ? undefined : status);
  const review = useReviewCompany();
  const { toast } = useToast();

  const [rejectTarget, setRejectTarget] = useState<AdminCompany | null>(null);
  const [reason, setReason] = useState("");

  const companies = data?.companies ?? [];

  const approve = (c: AdminCompany) => {
    review.mutate(
      { userId: c.userId, decision: "approve" },
      {
        onSuccess: () => toast({ title: "Company approved", description: c.companyName ?? c.email ?? "" }),
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
          toast({ title: "Company rejected", description: rejectTarget.companyName ?? rejectTarget.email ?? "" });
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
        icon={Building2}
        title="Company Management"
        subtitle="Review and verify employer / company registrations."
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
      ) : companies.length === 0 ? (
        <EmptyState icon={Building2} title="No companies found" description="No companies match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.userId}>
                    <TableCell className="font-medium">{c.companyName ?? "—"}</TableCell>
                    <TableCell>{c.industry ?? "—"}</TableCell>
                    <TableCell>{c.companySize ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {c.website}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isVerified ? "secondary" : "outline"}>
                        {c.isVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.approvalStatus)} className="capitalize">
                        {c.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={c.approvalStatus === "approved" || review.isPending}
                          onClick={() => approve(c)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={c.approvalStatus === "rejected" || review.isPending}
                          onClick={() => { setRejectTarget(c); setReason(""); }}
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
            <DialogTitle>Reject Company</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting{" "}
              <strong>{rejectTarget?.companyName ?? rejectTarget?.email}</strong>. This will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="reject-reason">Rejection reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Could not verify company registration."
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
