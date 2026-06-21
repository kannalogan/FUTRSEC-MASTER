import { useState } from "react";
import {
  useEmployerOffers, useUpdateOffer,
  type EmployerOffer,
} from "@/lib/employer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  sent: "#0EA5E9",
  accepted: "#22C55E",
  rejected: "#EF4444",
  withdrawn: "#64748B",
  expired: "#F97316",
};
const STATUSES = ["sent", "accepted", "rejected", "withdrawn", "expired"];

function fmtSalary(v: number | null): string {
  if (v == null) return "—";
  return `₹${v.toLocaleString("en-IN")}`;
}

export default function EmployerOffersPage() {
  const { toast } = useToast();
  const { data, isLoading } = useEmployerOffers();
  const updateOffer = useUpdateOffer();
  const offers = data?.offers ?? [];

  const [target, setTarget] = useState<EmployerOffer | null>(null);
  const [status, setStatus] = useState("sent");
  const [salary, setSalary] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [offerLetterUrl, setOfferLetterUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const openEdit = (o: EmployerOffer) => {
    setTarget(o);
    setStatus(o.status);
    setSalary(o.salary != null ? String(o.salary) : "");
    setJoiningDate(o.joiningDate ? o.joiningDate.slice(0, 10) : "");
    setOfferLetterUrl(o.offerLetterUrl ?? "");
    setExpiresAt(o.expiresAt ? o.expiresAt.slice(0, 10) : "");
  };

  const submit = () => {
    if (!target) return;
    updateOffer.mutate(
      {
        id: target.id,
        body: {
          status,
          salary: salary ? Number(salary) : null,
          joiningDate: joiningDate || undefined,
          offerLetterUrl: offerLetterUrl || undefined,
          expiresAt: expiresAt || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Offer updated" });
          setTarget(null);
        },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader icon={BadgeCheck} title="Offers" subtitle="Manage offers extended to candidates." />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : offers.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="No offers" description="Make offers to candidates from the candidates page." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="font-medium">{o.student?.fullName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.student?.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>{o.job?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className="border-0 capitalize" style={{ backgroundColor: `${STATUS_COLORS[o.status] ?? "#64748B"}20`, color: STATUS_COLORS[o.status] ?? "#64748B" }}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtSalary(o.salary)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {o.joiningDate ? format(new Date(o.joiningDate), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {o.expiresAt ? format(new Date(o.expiresAt), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(o)}>Update</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Offer</DialogTitle>
            <DialogDescription>
              {target?.student?.fullName ?? target?.student?.email} · {target?.job?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="of-salary">Salary</Label>
              <Input id="of-salary" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="700000" />
            </div>
            <div>
              <Label htmlFor="of-join">Joining Date</Label>
              <Input id="of-join" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="of-letter">Offer Letter URL</Label>
              <Input id="of-letter" value={offerLetterUrl} onChange={(e) => setOfferLetterUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="of-expires">Expires At</Label>
              <Input id="of-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={submit} disabled={updateOffer.isPending}>
              {updateOffer.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
