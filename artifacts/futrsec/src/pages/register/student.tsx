import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

const COUNTRY_CODES = ["+91", "+1", "+44", "+61", "+65", "+971", "+60", "+49", "+33", "+81"];

const COLLEGES = [
  "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IIT Kharagpur",
  "NIT Trichy", "NIT Warangal", "NIT Surathkal", "NIT Calicut",
  "BITS Pilani", "BITS Goa", "BITS Hyderabad",
  "VIT Vellore", "SRM University", "Manipal Institute of Technology",
  "Anna University", "Pune University", "Mumbai University", "Delhi University",
  "Amrita Vishwa Vidyapeetham", "Chandigarh University", "Lovely Professional University",
  "Other",
];

const STEPS = ["Personal Info", "Academic & Security", "Agreements"];

interface FormData {
  firstName: string; lastName: string; email: string;
  countryCode: string; phone: string;
  college: string; graduationYear: string;
  password: string; confirmPassword: string;
  agreeTerms: boolean; agreePrivacy: boolean; notRobot: boolean;
}

export default function RegisterStudent() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormData>({
    firstName: "", lastName: "", email: "",
    countryCode: "+91", phone: "",
    college: "", graduationYear: "",
    password: "", confirmPassword: "",
    agreeTerms: false, agreePrivacy: false, notRobot: false,
  });

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canNext0 = form.firstName && form.lastName && form.email.includes("@") && form.phone.length >= 8;
  const canNext1 = form.college && form.graduationYear && form.password.length >= 8 && form.password === form.confirmPassword;
  const canSubmit = form.agreeTerms && form.agreePrivacy && form.notRobot;

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);
    try {
      const res = await apiFetch<{ email: string; otp?: string }>("/api/auth/register/student", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: `${form.countryCode}${form.phone}`,
          college: form.college,
          graduationYear: form.graduationYear ? parseInt(form.graduationYear) : undefined,
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
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">Student Registration</h1>
            <p className="text-muted-foreground text-sm">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>

          <div className="flex gap-2 mb-8">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name <span className="text-destructive">*</span></Label>
                    <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Rahul" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name <span className="text-destructive">*</span></Label>
                    <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Kumar" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <select value={form.countryCode} onChange={e => set("countryCode", e.target.value)} className="w-24 rounded-md border border-input bg-background px-2 text-sm">
                      {COUNTRY_CODES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" className="flex-1" />
                  </div>
                </div>
                <Button className="w-full h-11" disabled={!canNext0} onClick={() => setStep(1)}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>College / Institution <span className="text-destructive">*</span></Label>
                  <Input list="colleges" value={form.college} onChange={e => set("college", e.target.value)} placeholder="Start typing your college..." />
                  <datalist id="colleges">
                    {COLLEGES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label>Graduation Year <span className="text-destructive">*</span></Label>
                  <select value={form.graduationYear} onChange={e => set("graduationYear", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select year</option>
                    {Array.from({ length: 10 }, (_, i) => 2023 + i).map(y => <option key={y}>{y}</option>)}
                  </select>
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
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button className="flex-1 h-11" disabled={!canNext1} onClick={() => setStep(2)}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="space-y-3">
                  {[
                    { key: "agreeTerms" as const, label: "I agree to the Terms of Use" },
                    { key: "agreePrivacy" as const, label: "I agree to the Privacy Policy" },
                    { key: "notRobot" as const, label: "I'm not a robot" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <input type="checkbox" checked={form[key] as boolean} onChange={e => set(key, e.target.checked)} className="h-4 w-4 accent-primary" />
                      <span className="text-sm text-foreground">{label}</span>
                      {form[key] && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
                    </label>
                  ))}
                </div>
                {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button className="flex-1 h-11" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send OTP <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already registered?{" "}
            <button onClick={() => setLocation("/login")} className="text-primary hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
