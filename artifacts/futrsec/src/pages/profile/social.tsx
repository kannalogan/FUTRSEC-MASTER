import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Linkedin, Github, Globe, Twitter, Save, ExternalLink } from "lucide-react";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";

const LINKS = [
  { key: "linkedinUrl", label: "LinkedIn", icon: Linkedin, color: "#0A66C2", placeholder: "https://linkedin.com/in/..." },
  { key: "githubUrl", label: "GitHub", icon: Github, color: "#181717", placeholder: "https://github.com/..." },
  { key: "portfolioUrl", label: "Portfolio", icon: Globe, color: "#10B981", placeholder: "https://yoursite.com" },
  { key: "twitterUrl", label: "Twitter / X", icon: Twitter, color: "#1DA1F2", placeholder: "https://x.com/..." },
] as const;

export default function SocialLinksPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["profile/me"],
    queryFn: () => apiFetch<any>("/api/profile/me"),
  });

  useEffect(() => {
    if (data?.profile) {
      setForm({
        linkedinUrl: data.profile.linkedinUrl ?? "",
        githubUrl: data.profile.githubUrl ?? "",
        portfolioUrl: data.profile.portfolioUrl ?? "",
        twitterUrl: data.profile.twitterUrl ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Record<string, string>) => apiFetch("/api/profile/me", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile/me"] });
      toast({ title: "Links saved!", description: "Your social links have been updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PageHeader icon={Globe} title="Social Links" subtitle="Connect your professional profiles" />

      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : (
        <Card className="bg-card border-border/60">
          <CardContent className="p-5 space-y-4">
            {LINKS.map((link) => {
              const Icon = link.icon;
              const val = form[link.key] ?? "";
              return (
                <div key={link.key}>
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
                    <Icon className="h-3.5 w-3.5" style={{ color: link.color }} />
                    {link.label}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={val}
                      onChange={(e) => setForm({ ...form, [link.key]: e.target.value })}
                      placeholder={link.placeholder}
                      className="flex-1 text-sm"
                    />
                    {val && (
                      <a href={val} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center h-9 w-9 rounded-md border border-border/60 hover:bg-muted shrink-0">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            <Button className="w-full" onClick={() => save.mutate(form)} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-1.5" />{save.isPending ? "Saving..." : "Save Links"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
