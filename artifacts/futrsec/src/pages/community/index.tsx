import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PageHeader, CardSkeleton, EmptyState } from "@/components/page-shell";
import { Users, Heart, MessageCircle, Search, TrendingUp, Send } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const TRENDING_TAGS = ["SOC", "VAPT", "GRC", "CEH", "SIEM", "Placement", "Labs"];

interface CommunityPost {
  id: number;
  author: string;
  role: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  time: string;
  liked: boolean;
  isOwn: boolean;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 8);
}

export default function CommunityPage() {
  const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: () => apiFetch<{ posts: CommunityPost[]; total: number }>("/api/community/posts"),
  });

  const createPost = useMutation({
    mutationFn: (body: { content: string; tags: string[] }) =>
      apiFetch("/api/community/posts", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setContent("");
      setTagInput("");
      qc.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: (postId: number) =>
      apiFetch(`/api/community/posts/${postId}/like`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-posts"] }),
  });

  const posts = (data?.posts ?? []).filter(
    (p) =>
      !search ||
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Community" subtitle="Connect with fellow cybersecurity learners across India" icon={Users} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <div>
          <div className="bg-card border border-border/60 rounded-xl p-4 elevation-1 mb-4">
            <Textarea
              placeholder="Share something with the community..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              className="resize-none min-h-[80px]"
            />
            <div className="flex items-center gap-2 mt-3">
              <Input
                placeholder="Tags (comma separated)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => createPost.mutate({ content: content.trim(), tags: parseTags(tagInput) })}
                disabled={!content.trim() || createPost.isPending}
                className="shrink-0"
              >
                <Send className="h-4 w-4 mr-1.5" /> Post
              </Button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search posts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {isLoading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} rows={3} />)}</div>
          ) : posts.length === 0 ? (
            <EmptyState icon={Users} title="No posts yet" description="Be the first to share something with the community." />
          ) : (
            <div className="space-y-4">
              {posts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="bg-card border border-border/60 rounded-xl p-5 elevation-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{(post.author?.[0] ?? "?").toUpperCase()}</div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{post.author}</p>
                        <p className="text-xs text-muted-foreground">{post.role} · {post.time}</p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>
                    {post.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        {post.tags.map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">#{tag}</Badge>)}
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                      <button
                        onClick={() => toggleLike.mutate(post.id)}
                        disabled={toggleLike.isPending}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
                      </button>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" /> {post.comments} replies</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-xl p-4 elevation-1">
            <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-primary" /><p className="text-sm font-semibold text-foreground">Trending Topics</p></div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <button key={tag} onClick={() => setSearch(tag)} className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">#{tag}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
