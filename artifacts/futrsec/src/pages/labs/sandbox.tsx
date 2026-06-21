import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, Play, Square, Terminal, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const STATUS_META: Record<string, { label: string; color: string }> = {
  starting: { label: "Starting", color: "#F97316" },
  running: { label: "Running", color: "#10B981" },
  terminated: { label: "Terminated", color: "#94a3b8" },
  expired: { label: "Expired", color: "#EF4444" },
};

interface Session {
  id: number;
  labId: number | null;
  sessionToken: string;
  status: string;
  ipAddress: string | null;
  port: number | null;
  expiresAt: string;
  createdAt: string;
}

export default function SandboxPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/sandbox"],
    queryFn: () => apiFetch<Session[]>("/api/sandbox"),
  });

  const launch = useMutation({
    mutationFn: () => apiFetch("/api/sandbox", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      toast({ title: "Sandbox launched", description: "Your isolated environment is starting." });
      qc.invalidateQueries({ queryKey: ["/api/sandbox"] });
    },
    onError: () => toast({ title: "Error", description: "Could not launch sandbox.", variant: "destructive" }),
  });

  const terminate = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/sandbox/${id}/terminate`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Terminated", description: "Sandbox session ended." });
      qc.invalidateQueries({ queryKey: ["/api/sandbox"] });
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <PageHeader
        icon={Cpu}
        title="Sandbox"
        subtitle="Spin up isolated environments to practice safely"
        actions={
          <Button size="sm" onClick={() => launch.mutate()} disabled={launch.isPending}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {launch.isPending ? "Launching…" : "New Sandbox"}
          </Button>
        }
      />

      {isLoading ? (
        <GridSkeleton cols={1} rows={3} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No sandbox sessions"
          description="Launch a sandbox to get an isolated, disposable environment for hands-on practice."
          action={
            <Button size="sm" onClick={() => launch.mutate()} disabled={launch.isPending}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Launch Sandbox
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.map((s, idx) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.terminated;
            const active = s.status !== "terminated" && s.status !== "expired";
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
              >
                <Card className={`bg-white border-border/60 ${!active ? "opacity-65" : ""}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Terminal className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-xs text-foreground truncate">{s.sessionToken}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {s.ipAddress && <span>{s.ipAddress}{s.port ? `:${s.port}` : ""}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          expires {new Date(s.expiresAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className="text-[10px] shrink-0"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}
                    >
                      {meta.label}
                    </Badge>
                    {active && (
                      <Button size="sm" variant="outline" onClick={() => terminate.mutate(s.id)} disabled={terminate.isPending}>
                        <Square className="h-3.5 w-3.5 mr-1" />
                        Stop
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
