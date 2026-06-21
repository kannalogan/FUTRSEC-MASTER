import { useAdminPayments, type AdminPayment } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { exportToCSV } from "@/lib/export-utils";
import { Receipt, Download } from "lucide-react";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "success" || status === "completed" || status === "paid") return "secondary";
  if (status === "failed" || status === "refunded") return "destructive";
  return "outline";
}

export default function AdminPaymentsPage() {
  const { data, isLoading } = useAdminPayments();
  const payments = data?.payments ?? [];

  const handleExport = () => {
    exportToCSV<AdminPayment>("admin-payments", [
      { key: "user", label: "User", format: (r) => r.user?.fullName ?? "" },
      { key: "email", label: "Email", format: (r) => r.user?.email ?? "" },
      { key: "amount", label: "Amount", format: (r) => r.amount },
      { key: "status", label: "Status" },
      { key: "gateway", label: "Gateway" },
    ], payments);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={Receipt}
        title="Payments"
        subtitle="All payment transactions processed across the platform."
        actions={
          <Button size="sm" variant="outline" onClick={handleExport} disabled={payments.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments found" description="No payments have been processed yet." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gateway</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.user?.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.user?.email ?? "—"}</TableCell>
                    <TableCell className="font-medium">₹{p.amount.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{p.gateway}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
