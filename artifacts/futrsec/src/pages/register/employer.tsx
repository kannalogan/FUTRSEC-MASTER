import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

const INDUSTRIES = ["Cybersecurity", "Information Technology", "Banking & Finance", "Telecommunications", "Defence & Government", "Healthcare", "Consulting", "Other"];
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"];

export default function RegisterEmployer() {
  const [, setLocation] = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    companyName: "", designation: "", website: "", linkedinUrl: "",
    industry: "", companySize: "",
    password: "", confirmPassword: "",
    agreeTerms: false, agreePrivacy: false, notRobot: false,
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const passOk = form.password.length >= 8 && form.password === form.confirmPassword;
  const canSubmit = form.firstName && form.lastName && form.email.includes("@") && form.phone &&
    form.companyName && form.designation && passOk &&
    form.agreeTerms && form.agreePrivacy && form.notRobot;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await apiFetch<{ email: string; otp?: string }>("/api/auth/register/employer", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          companyName: form.companyName,
          designation: form.designation,
          website: form.website || undefined,
          linkedinUrl: form.linkedinUrl || undefined,
          industry: form.industry || undefined,
          companySize: form.companySize || undefined,
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

  const Field = ({ label, id, required, children }: { label: string; id: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label} {required && <span className="text-destructive">*</span>}</Label>
      {children}
    </div>
  );

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
            <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">Employer Registration</h1>
            <p className="text-muted-foreground text-sm">Hire pre-assessed cybersecurity talent from India</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="pb-1 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Details</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" id="fn" required><Input id="fn" value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Ankit" /></Field>
                  <Field label="Last Name" id="ln" required><Input id="ln" value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Gupta" /></Field>
                </div>
                <Field label="Official Email" id="email" required><Input id="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="ankit@company.com" /></Field>
                <Field label="Phone" id="phone" required><Input id="phone" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 9876543210" /></Field>
              </div>
            </div>

            <div className="pb-1 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Company Details</p>
              <div className="space-y-3">
                <Field label="Company Name" id="company" required><Input id="company" value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Acme Security Pvt. Ltd." /></Field>
                <Field label="Your Designation" id="desig" required><Input id="desig" value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. HR Manager, Talent Acquisition" /></Field>
                <Field label="Company Website" id="site"><Input id="site" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://company.com" /></Field>
                <Field label="LinkedIn" id="li"><Input id="li" value={form.linkedinUrl} onChange={e => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/company/..." /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Industry" id="industry">
                    <select id="industry" value={form.industry} onChange={e => set("industry", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select...</option>
                      {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                    </select>
                  </Field>
                  <Field label="Company Size" id="size">
                    <select id="size" value={form.companySize} onChange={e => set("companySize", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select...</option>
                      {COMPANY_SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            <div className="pb-1 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account Security</p>
              <div className="space-y-3">
                <Field label="Password" id="pass" required>
                  <div className="relative">
                    <Input id="pass" type={showPass ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm Password" id="cpass" required>
                  <div className="relative">
                    <Input id="cpass" type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Re-enter password" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                </Field>
              </div>
            </div>

            <div className="space-y-2">
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
