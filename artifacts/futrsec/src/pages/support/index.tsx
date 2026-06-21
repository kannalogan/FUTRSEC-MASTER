import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Headphones, Send, CheckCircle2, Mail, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["general", "labs", "jobs", "billing", "technical", "account"];

export default function SupportPage() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () => apiFetch<any>("/api/support/ticket", {
      method: "POST",
      body: JSON.stringify({ subject, category, message }),
    }),
    onSuccess: (data: any) => {
      setTicketId(data?.ticketId ?? "TKT");
      setSubject(""); setMessage(""); setCategory("general");
      toast({ title: "Ticket submitted!", description: "Our team will respond within 24 hours." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PageHeader icon={Headphones} title="Support" subtitle="Get help from the FUTRSEC team" />

      {ticketId ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-card border-emerald-200/60">
            <CardContent className="p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-1">Ticket submitted!</h3>
              <p className="text-sm text-muted-foreground mb-1">Your ticket ID is</p>
              <p className="text-sm font-mono font-bold text-foreground mb-4">{ticketId}</p>
              <p className="text-xs text-muted-foreground mb-5">Our team will respond to your email within 24 hours.</p>
              <Button size="sm" variant="outline" onClick={() => setTicketId(null)}>Submit Another</Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card className="bg-card border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />Submit a Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your issue" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                      category === c ? "bg-primary text-white border-primary" : "border-border/60 text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => submit.mutate()}
              disabled={submit.isPending || !subject.trim() || !message.trim()}
            >
              <Send className="h-4 w-4 mr-1.5" />{submit.isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
        <BookOpen className="h-3.5 w-3.5" />
        Looking for quick answers? Visit the <Link href="/help" className="text-primary hover:underline">Help Center</Link>
      </p>
    </div>
  );
}
