import { useAdminConsentLogs } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { format } from "date-fns";
import { FileLock2 } from "lucide-react";

function YesNo({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "secondary" : "outline"}>{value ? "Yes" : "No"}</Badge>
  );
}

export default function AdminConsentLogsPage() {
  const { data, isLoading } = useAdminConsentLogs();
  const consents = data?.consents ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={FileLock2}
        title="Consent Logs"
        subtitle="DPDP consent preferences recorded for each user."
      />

      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : consents.length === 0 ? (
        <EmptyState icon={FileLock2} title="No consent records" description="Consent records will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Marketing</TableHead>
                  <TableHead>Analytics</TableHead>
                  <TableHead>Data Processing</TableHead>
                  <TableHead>Third Party</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.user?.fullName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.user?.email ?? "—"}</TableCell>
                    <TableCell><YesNo value={c.marketing} /></TableCell>
                    <TableCell><YesNo value={c.analytics} /></TableCell>
                    <TableCell><YesNo value={c.dataProcessing} /></TableCell>
                    <TableCell><YesNo value={c.thirdParty} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.updatedAt ? format(new Date(c.updatedAt), "dd MMM yyyy, HH:mm") : "—"}
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
