import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Search, ChevronDown, MessageSquare } from "lucide-react";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";

interface Faq {
  id: number;
  q: string;
  a: string;
  category: string;
}

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/support/faqs"],
    queryFn: () => apiFetch<Faq[]>("/api/support/faqs"),
  });

  const filtered = (data ?? []).filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PageHeader icon={HelpCircle} title="Help Center" subtitle="Find answers to common questions" />

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help articles..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <CardSkeleton key={i} rows={1} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No results" description="Try a different search, or contact our support team for help." />
      ) : (
        <div className="space-y-2">
          {filtered.map((faq, idx) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
            >
              <Card className="bg-white border-border/60">
                <button className="w-full text-left" onClick={() => setOpen(open === faq.id ? null : faq.id)}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open === faq.id ? "rotate-180" : ""}`} />
                  </CardContent>
                </button>
                <AnimatePresence>
                  {open === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed px-4 pb-4">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Card className="bg-gradient-to-br from-primary/5 to-white border-primary/20 mt-6">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Still need help?</h3>
              <p className="text-xs text-muted-foreground">Our support team responds within 24 hours</p>
            </div>
          </div>
          <Link href="/support"><Button size="sm" className="shrink-0">Contact Support</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
