import { useMentorAuditLogs } from "@/lib/mentor-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { History, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function MentorAuditLogsPage() {
  const { data, isLoading } = useMentorAuditLogs();
  const logs = data?.logs ?? [];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader 
          icon={History} 
          title="Audit Logs" 
          subtitle="An immutable, cryptographically-backed record of your administrative actions." 
        />
      </motion.div>

      {isLoading ? (
        <CardSkeleton rows={10} />
      ) : logs.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <EmptyState 
            icon={ShieldAlert} 
            title="Clean ledger" 
            description="No administrative actions have been recorded for your account yet." 
          />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="glass-card overflow-hidden border-border/60">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-48 py-4">Action Signature</TableHead>
                  <TableHead className="w-64">Target Entity</TableHead>
                  <TableHead>Metadata Payload</TableHead>
                  <TableHead className="text-right w-48">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l, idx) => (
                  <TableRow key={l.id} className="hover:bg-muted/30 transition-colors font-mono text-sm">
                    <TableCell className="py-4">
                      <Badge variant="outline" className="bg-background/50 font-bold tracking-tight border-border/80 text-foreground py-1 px-2 rounded-md">
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.entityType ? (
                        <span className="flex items-center gap-2">
                          <span className="text-foreground font-semibold">{l.entityType}</span>
                          {l.entityId && <span className="opacity-60">id:{l.entityId}</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground/80 break-all max-w-[300px]">
                      {l.metadata ? (
                        <span className="line-clamp-2" title={JSON.stringify(l.metadata)}>
                          {JSON.stringify(l.metadata).replace(/[{""}]/g, ' ')}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString(undefined, { 
                        year: 'numeric', month: 'short', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
