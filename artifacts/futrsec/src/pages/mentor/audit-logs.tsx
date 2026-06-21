import { useMentorAuditLogs } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { History } from "lucide-react";

export default function MentorAuditLogsPage() {
  const { data, isLoading } = useMentorAuditLogs();
  const logs = data?.logs ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader icon={History} title="Audit Logs" subtitle="An immutable record of every action you take on the platform." />

      {isLoading ? (
        <CardSkeleton rows={8} />
      ) : logs.length === 0 ? (
        <EmptyState icon={History} title="No activity yet" description="Your actions will appear here as you use the dashboard." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant="secondary" className="font-mono text-xs">{l.action}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.entityType ? `${l.entityType}${l.entityId ? ` #${l.entityId}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {l.metadata ? JSON.stringify(l.metadata) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
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
