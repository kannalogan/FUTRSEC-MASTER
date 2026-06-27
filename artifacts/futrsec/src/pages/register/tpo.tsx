import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

const BLOCKED_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "rediffmail.com"];

function isInstitutionalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return !BLOCKED_DOMAINS.includes(domain);
}

export default function RegisterTPO() {
  const [, setLocation] = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    institution: "", designation: "", password: "", confirmPassword: "",
    agreeTerms: false, agreePrivacy: false, notRobot: false,
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const emailOk = form.email.includes("@") && isInstitutionalEmail(form.email);
  const passOk = form.password.length >= 8 && form.password === form.confirmPassword;
  const canSubmit = form.firstName && form.lastName && emailOk && form.phone && form.institution && form.designation && passOk && form.agreeTerms && form.agreePrivacy && form.notRobot;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await apiFetch<{ email: string; otp?: string }>("/api/auth/register/tpo", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          institution: form.institution,
          designation: form.designation,
          password: form.password,
        }),
      });
      setLocation(`/auth/verify?email=${encodeURIComponent(res.email)}&flow=register${res.otp ? `&otp=${res.otp}` : ""}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b">
        <button onClick={() => setLocation("/register")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center glow-primary">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="font-heading font-bold text-xl tracking-tight">FUTRSEC</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">TPO Registration</h1>
            <p className="text-muted-foreground text-sm">Training & Placement Officer — Institutional account</p>
          </div>

          <div className="flex items-start gap-2 bg-info/10 border border-info/30 rounded-lg px-3 py-2.5 mb-6 text-xs text-info">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Use your institutional email (e.g., tpo@college.ac.in). Gmail, Yahoo and personal emails are not accepted. Your account requires admin approval before access.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Priya" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Sharma" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Institutional Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="tpo@college.ac.in" />
              {form.email && !emailOk && (
                <p className="text-xs text-destructive">Please use an institutional email address</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 9876543210" />
            </div>

            <div className="space-y-1.5">
              <Label>College / Institution <span className="text-destructive">*</span></Label>
              <Input value={form.institution} onChange={e => set("institution", e.target.value)} placeholder="Your institution name" />
            </div>

            <div className="space-y-1.5">
              <Label>Designation <span className="text-destructive">*</span></Label>
              <Input value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Training & Placement Officer" />
            </div>

            <div className="space-y-1.5">
              <Label>Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Confirm Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Re-enter password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              {[
                { key: "agreeTerms" as const, label: "I agree to the Terms of Use" },
                { key: "agreePrivacy" as const, label: "I agree to the Privacy Policy" },
                { key: "notRobot" as const, label: "I'm not a robot" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <input type="checkbox" checked={form[key] as boolean} onChange={e => set(key, e.target.checked)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">{label}</span>
                  {form[key] && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={!canSubmit || isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Register & Verify Email
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already registered?{" "}
            <button onClick={() => setLocation("/login")} className="text-primary hover:underline">Sign in</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
