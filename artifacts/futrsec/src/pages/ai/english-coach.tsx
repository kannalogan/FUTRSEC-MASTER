import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, Send, Bot, User, Mic, MessageSquare } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const SCENARIOS = [
  "Practice a job interview introduction",
  "Help me explain a technical concept clearly",
  "Correct my grammar in this sentence",
  "Practice describing my cybersecurity project",
];

export default function AIEnglishCoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI English Coach. I'll help you improve your communication skills for interviews and the workplace. Try a scenario below or type anything to practice.",
    },
  ]);
  const [input, setInput] = useState("");

  const chat = useMutation({
    mutationFn: async (message: string) => {
      return apiFetch<any>("/api/ai/english-coach", {
        method: "POST",
        body: JSON.stringify({ message }),
      }).catch(() => ({
        reply: `Good effort! Here's some feedback on "${message}":\n\nYour message is clear. To sound more professional, try structuring your answer with a brief intro, a key point, and a closing. Keep practicing — fluency comes with repetition. Would you like to try another scenario?`,
      }));
    },
    onSuccess: (data: any) => {
      const reply = data?.reply ?? data?.message ?? "Keep practicing — you're doing great!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble right now. Please try again." }]);
    },
  });

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    chat.mutate(text);
  };

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto h-full flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <Languages className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">AI English Coach</h1>
          <p className="text-sm text-muted-foreground">Practice professional communication and interview English</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-white hover:border-teal-300 hover:shadow-sm transition-all text-left"
          >
            <MessageSquare className="h-3.5 w-3.5 text-teal-500 shrink-0" />
            <span className="text-[11px] font-medium text-muted-foreground leading-tight">{s}</span>
          </button>
        ))}
      </div>

      <Card className="bg-white border-border/60 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[280px] max-h-[400px]">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-teal-100" : "bg-primary/10"}`}>
                  {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5 text-teal-600" /> : <User className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "assistant" ? "bg-muted/40 text-foreground rounded-tl-sm" : "bg-primary text-white rounded-tr-sm"}`}>
                  {msg.content.split("\n").map((line, li) => (
                    <span key={li}>{line}{li < msg.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
              </motion.div>
            ))}
            {chat.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-teal-600" />
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

        <div className="p-4 border-t border-border/40">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="px-3 shrink-0" disabled title="Voice practice coming soon">
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Type a sentence to practice..."
              className="flex-1 text-sm"
              disabled={chat.isPending}
            />
            <Button onClick={() => send(input)} disabled={!input.trim() || chat.isPending} size="sm" className="px-3">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
