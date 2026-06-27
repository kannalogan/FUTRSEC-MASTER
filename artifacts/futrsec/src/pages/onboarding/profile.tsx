import { useState } from "react";
import { useCompleteProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Loader2, GraduationCap, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

const ROLES = [
  { value: "student", label: "Student", icon: GraduationCap, desc: "Learning cybersecurity from scratch" },
  { value: "professional", label: "Professional", icon: Briefcase, desc: "Upskilling or pivoting into security" },
  { value: "mentor", label: "Mentor", icon: User, desc: "Guiding the next generation" },
];

export default function Profile() {
  const [_, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [role, setRole] = useState<"student" | "professional" | "mentor">("student");

  const completeProfile = useCompleteProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    completeProfile.mutate(
      { data: { fullName: fullName.trim(), college: college || undefined, role } },
      {
        onSuccess: () => {
          setLocation("/onboarding/tracks");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Build Your Profile</h1>
          <p className="text-muted-foreground mt-2">
            Tell us about yourself so we can personalize your learning journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="fullName"
              placeholder="Arjun Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="college">College / Organization <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="college"
              placeholder="IIT Bombay / TCS / Independent"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-3">
            <Label>I am a…</Label>
            <div className="grid grid-cols-1 gap-3">
              {ROLES.map(({ value, label, icon: Icon, desc }) => (
                <Card
                  key={value}
                  onClick={() => setRole(value as typeof role)}
                  className={`hover-lift cursor-pointer transition-all border-2 ${
                    role === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      role === value ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Icon className={`w-5 h-5 ${role === value ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${role === value ? "text-primary" : ""}`}>{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-base"
            disabled={!fullName.trim() || completeProfile.isPending}
          >
            {completeProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue to Track Selection
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
