import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Play, Square, Server, Clock, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, GridSkeleton, EmptyState } from "@/components/page-shell";

const DIFF_COLORS: Record<string, string> = {
  beginner: "#10B981",
  intermediate: "#F97316",
  advanced: "#EF4444",
};

interface VM {
  id: number;
  title: string;
  description: string;
  dockerImage: string | null;
  difficulty: string;
  tags: string[];
  estimatedMinutes: number;
  session: { id: number; status: string } | null;
}

export default function VMsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/vms"],
    queryFn: () => apiFetch<VM[]>("/api/vms"),
  });

  const launch = useMutation({
    mutationFn: (labId: number) => apiFetch("/api/sandbox", { method: "POST", body: JSON.stringify({ labId }) }),
    onSuccess: () => {
      toast({ title: "VM launching", description: "Your virtual machine is starting up." });
      qc.invalidateQueries({ queryKey: ["/api/vms"] });
    },
    onError: () => toast({ title: "Error", description: "Could not launch VM.", variant: "destructive" }),
  });

  const terminate = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/sandbox/${id}/terminate`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "VM stopped", description: "The virtual machine has been terminated." });
      qc.invalidateQueries({ queryKey: ["/api/vms"] });
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader icon={Globe} title="Virtual Machines" subtitle="Launch pre-configured VMs for hands-on lab work" />

      {isLoading ? (
        <GridSkeleton cols={3} rows={2} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No virtual machines"
          description="VM-based labs for your track will appear here when available."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((vm, idx) => {
            const diff = vm.difficulty ?? "beginner";
            const running = vm.session && vm.session.status !== "terminated";
            return (
              <motion.div
                key={vm.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                whileHover={{ y: -2 }}
              >
                <Card className="bg-card border-border/60 hover:shadow-md transition-all h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                        <Server className="h-5 w-5 text-cyan-500" />
                      </div>
                      <Badge
                        className="text-[10px] px-2 shrink-0"
                        style={{ backgroundColor: `${DIFF_COLORS[diff]}15`, color: DIFF_COLORS[diff], borderColor: `${DIFF_COLORS[diff]}30` }}
                      >
                        {diff}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight mb-1">{vm.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{vm.description}</p>
                    {vm.dockerImage && (
                      <p className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded mb-3 truncate">
                        {vm.dockerImage}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{vm.estimatedMinutes}m</span>
                      {vm.tags?.[0] && (
                        <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{vm.tags[0]}</span>
                      )}
                    </div>
                    {running ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => vm.session && terminate.mutate(vm.session.id)}
                        disabled={terminate.isPending}
                      >
                        <Square className="h-3.5 w-3.5 mr-1.5" />
                        Stop VM
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full" onClick={() => launch.mutate(vm.id)} disabled={launch.isPending}>
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Launch VM
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
