import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, User, Brain, TrendingUp, Target, Sparkles, ChevronRight,
  Lightbulb, Map, BookOpen, Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

type Message = { role: "user" | "assistant"; content: string; timestamp: Date };

const QUICK_PROMPTS = [
  "What skills do I need for an SOC Analyst role in India?",
  "How long will it take to become job-ready as a VAPT professional?",
  "What certifications are most valued for GRC roles?",
  "How to negotiate salary for a cybersecurity role in India?",
  "What companies are hiring for SOC roles in Bangalore?",
  "How to build a portfolio for VAPT penetration testing?",
];

export default function AICareerCoach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm your AI Career Coach. I can help you with career planning, skill development, job market insights, and placement strategy for cybersecurity roles in India. What would you like to explore today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const { toast } = useToast();

  const { data: profileData } = useQuery({
    queryKey: ["profile/me"],
    queryFn: () => apiFetch<any>("/api/profile/me"),
  });

  const track = profileData?.user?.track;

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiFetch<any>("/api/ai/career-coach", {
        method: "POST",
        body: JSON.stringify({
          message,
          context: {
            track: track?.name,
            fullName: profileData?.user?.fullName,
          },
        }),
      }).catch(() => ({
        reply: `As your AI Career Coach, I can guide you on: **${message}**\n\nHere's what I recommend based on your ${track?.name ?? "cybersecurity"} track:\n\n1. **Build Core Skills**: Focus on the fundamentals of your chosen domain first.\n2. **Get Certified**: Industry certifications significantly improve employability in India.\n3. **Practice Hands-On**: Use labs and CTF challenges to build practical experience.\n4. **Network**: Connect with professionals in cybersecurity LinkedIn groups.\n\nWould you like me to create a personalized roadmap for you?`,
      }));
      return response;
    },
    onSuccess: (data: any, variables) => {
      const reply = data?.reply ?? data?.message ?? "I'm here to help with your career questions!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: new Date() }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: new Date() }]);
    setInput("");
    chatMutation.mutate(text);
  };

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto h-full flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Brain className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI Career Coach</h1>
          <p className="text-sm text-muted-foreground">Personalized career guidance for cybersecurity professionals</p>
        </div>
        {track && <Badge className="ml-auto bg-purple-100 text-purple-700 border-purple-200">{track.name}</Badge>}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Career Roadmap", icon: Map, color: "#2563EB" },
          { label: "Skill Assessment", icon: Target, color: "#10B981" },
          { label: "Job Market", icon: Briefcase, color: "#F97316" },
          { label: "Learning Plan", icon: BookOpen, color: "#8B5CF6" },
          { label: "Salary Guide", icon: TrendingUp, color: "#06B6D4" },
          { label: "Interview Prep", icon: Lightbulb, color: "#EF4444" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => sendMessage(`Tell me about ${item.label} for cybersecurity in India`)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border/60 bg-white hover:shadow-sm hover:border-border transition-all text-center"
          >
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
              <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground leading-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Chat */}
      <Card className="bg-white border-border/60 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant" ? "bg-purple-100" : "bg-primary/10"
                }`}>
                  {msg.role === "assistant"
                    ? <Bot className="h-3.5 w-3.5 text-purple-600" />
                    : <User className="h-3.5 w-3.5 text-primary" />
                  }
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-muted/40 text-foreground rounded-tl-sm"
                    : "bg-primary text-white rounded-tr-sm"
                }`}>
                  {msg.content.split("\n").map((line, li) => (
                    <span key={li}>
                      {line.replace(/\*\*(.*?)\*\*/g, "$1")}{li < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
            {chatMutation.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-2 border-t border-border/40">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PROMPTS.slice(0, 3).map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-[11px] text-muted-foreground whitespace-nowrap px-2.5 py-1.5 rounded-full border border-border/60 hover:border-primary hover:text-primary transition-colors shrink-0"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/40">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask me anything about your cybersecurity career..."
              className="flex-1 text-sm"
              disabled={chatMutation.isPending}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || chatMutation.isPending}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
