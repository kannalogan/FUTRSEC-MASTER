import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Save, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { PageHeader, CardSkeleton } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function ResumePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [url, setUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["profile/me"],
    queryFn: () => apiFetch<any>("/api/profile/me"),
  });

  const resumeUrl = url ?? data?.profile?.resumeUrl ?? "";

  const save = useMutation({
    mutationFn: (resumeUrl: string) => apiFetch("/api/profile/me", { method: "PUT", body: JSON.stringify({ resumeUrl }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile/me"] });
      toast({ title: "Resume saved!", description: "Your resume link has been updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const profile = data?.profile;
  const checklist = [
    { label: "Resume uploaded", done: !!profile?.resumeUrl },
    { label: "LinkedIn connected", done: !!profile?.linkedinUrl },
    { label: "GitHub connected", done: !!profile?.githubUrl },
    { label: "Bio completed", done: !!profile?.bio },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <PageHeader icon={FileText} title="Resume" subtitle="Manage your resume and get it job-ready" />

      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />Resume Link
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste a shareable link to your resume (Google Drive, Dropbox, or a hosted PDF).
              </p>
              <div className="flex gap-2">
                <Input
                  value={resumeUrl}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={() => save.mutate(resumeUrl)} disabled={save.isPending || !resumeUrl}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />Save
                </Button>
              </div>
              {profile?.resumeUrl && (
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />View current resume
                </a>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />Job-Readiness Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2.5">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  {item.done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                  <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                  {item.done && <Badge className="ml-auto bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">Done</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200/60">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">AI Resume Analyzer</h3>
                  <p className="text-xs text-muted-foreground">Get instant feedback to improve your resume</p>
                </div>
              </div>
              <Link href="/ai/resume-analyzer">
                <Button size="sm" className="shrink-0">Analyze</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
