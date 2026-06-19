import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, BookOpen, Users, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: BookOpen, title: "Structured Learning Paths", desc: "Modules, labs, and quizzes curated by industry experts." },
  { icon: Users, title: "Mentorship Network", desc: "Get paired with security professionals from top companies." },
  { icon: BarChart3, title: "Placement Assistance", desc: "Resume review, mock interviews, and job referrals." },
];

export default function Complete() {
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
          className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-center gap-2 font-heading font-bold text-xl text-muted-foreground mb-3">
            <Shield className="w-5 h-5" />
            FUTRSEC
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight mb-3">
            You're all set!
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-10">
            Your profile is complete and your track has been selected. Your personalized learning journey begins now.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-4 mb-10 text-left"
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={() => setLocation("/privacy")}
          >
            Enter the Platform
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
