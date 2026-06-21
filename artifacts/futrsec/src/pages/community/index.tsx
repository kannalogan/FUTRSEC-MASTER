import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { Users, Heart, MessageCircle, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const TRENDING_TAGS = ["SOC", "VAPT", "GRC", "CEH", "SIEM", "Placement", "Labs"];

export default function CommunityPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: () => apiFetch<{ posts: any[]; total: number }>("/api/community/posts"),
  });

  const posts = (data?.posts ?? []).filter(p =>
    !search || p.content.toLowerCase().includes(search.toLowerCase()) || p.author.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Community" subtitle="Connect with fellow cybersecurity learners across India" icon={Users} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search posts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {isLoading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} rows={3} />)}</div>
          ) : posts.length === 0 ? (
            <EmptyState icon={Users} title="No posts found" description="Be the first to share something with the community." />
          ) : (
            <div className="space-y-4">
              {posts.map((post: any, i: number) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="bg-white border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{post.author[0]}</div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{post.author}</p>
                        <p className="text-xs text-muted-foreground">{post.role} · {post.time}</p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-3">{post.content}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {post.tags?.map((tag: string) => <Badge key={tag} variant="outline" className="text-[10px]">#{tag}</Badge>)}
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                      <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-500 transition-colors"><Heart className="h-3.5 w-3.5" /> {post.likes}</button>
                      <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"><MessageCircle className="h-3.5 w-3.5" /> {post.comments} replies</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-border/60 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-primary" /><p className="text-sm font-semibold text-foreground">Trending Topics</p></div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map(tag => (
                <button key={tag} onClick={() => setSearch(tag)} className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">#{tag}</button>
              ))}
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-1">Join our Discord</p>
            <p className="text-xs text-muted-foreground mb-3">Real-time discussions with 2,400+ security learners.</p>
            <Button variant="outline" size="sm" className="w-full text-xs">Open Discord</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
