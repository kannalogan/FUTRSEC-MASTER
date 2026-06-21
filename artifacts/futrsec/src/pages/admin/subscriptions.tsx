import { useAdminSubscriptions } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { CreditCard } from "lucide-react";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "secondary";
  if (status === "cancelled" || status === "expired") return "destructive";
  return "outline";
}

export default function AdminSubscriptionsPage() {
  const { data, isLoading } = useAdminSubscriptions();
  const subscriptions = data?.subscriptions ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={CreditCard}
        title="Subscriptions"
        subtitle="All active and historical subscriptions across the platform."
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : subscriptions.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions found" description="No subscriptions have been created yet." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.user?.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.user?.email ?? "—"}</TableCell>
                    <TableCell className="capitalize">{s.plan}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)} className="capitalize">{s.status}</Badge>
                    </TableCell>
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
