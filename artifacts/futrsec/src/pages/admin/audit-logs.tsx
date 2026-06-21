import { useState } from "react";
import { useAdminAuditLogs } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { format } from "date-fns";
import { History, Search } from "lucide-react";

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState("");
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useAdminAuditLogs(filter || undefined);
  const logs = data?.logs ?? [];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter(action.trim());
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        icon={History}
        title="Audit Logs"
        subtitle="An immutable record of administrative actions across the platform."
      />

      <form onSubmit={onSearch} className="flex gap-2 mb-6 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">Filter</Button>
        {filter && (
          <Button type="button" variant="ghost" onClick={() => { setAction(""); setFilter(""); }}>
            Clear
          </Button>
        )}
      </form>

      {isLoading ? (
        <CardSkeleton rows={8} />
      ) : logs.length === 0 ? (
        <EmptyState icon={History} title="No audit logs" description="No actions match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id} title={l.metadata ?? undefined}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {l.createdAt ? format(new Date(l.createdAt), "dd MMM yyyy, HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{l.user?.fullName ?? l.user?.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">{l.action}</Badge>
                    </TableCell>
                    <TableCell>{l.entityType ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.entityId ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{l.ipAddress ?? "—"}</TableCell>
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
