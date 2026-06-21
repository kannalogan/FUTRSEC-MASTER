import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await apiFetch<{ message: string; otp?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res.otp) setDevOtp(res.otp);
      setStep("otp");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await apiFetch("/api/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      setStep("password");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setIsLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const STEPS: Step[] = ["email", "otp", "password"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b">
        <button onClick={() => setLocation("/login")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-heading font-bold text-xl tracking-tight">FUTRSEC</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          {step !== "done" && (
            <div className="flex gap-2 mb-8">
              {STEPS.map((s, i) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-heading font-bold mb-2">Forgot password?</h1>
                <p className="text-muted-foreground text-sm mb-6">Enter your registered email and we'll send you a reset code.</p>
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
                  </div>
                  {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={!email || isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send Reset Code
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-heading font-bold mb-2">Enter reset code</h1>
                <p className="text-muted-foreground text-sm mb-6">We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span></p>
                {devOtp && (
                  <div className="mb-4 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-3 py-2">
                    Dev mode — OTP: <span className="font-mono font-bold">{devOtp}</span>
                  </div>
                )}
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="otp">6-digit code</Label>
                    <Input id="otp" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" maxLength={6} inputMode="numeric" className="font-mono text-lg tracking-widest text-center" autoFocus />
                  </div>
                  {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={otp.length !== 6 || isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verify Code
                  </Button>
                  <button type="button" onClick={() => setStep("email")} className="w-full text-sm text-muted-foreground hover:text-foreground">
                    ← Back to email
                  </button>
                </form>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-heading font-bold mb-2">Set new password</h1>
                <p className="text-muted-foreground text-sm mb-6">Choose a strong password for your account.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" autoFocus />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm Password</Label>
                    <div className="relative">
                      <Input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
                  <Button type="submit" className="w-full h-11" disabled={!password || !confirm || isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Reset Password
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-heading font-bold mb-3">Password reset!</h1>
                <p className="text-muted-foreground text-sm mb-8">Your password has been updated. You can now sign in with your new password.</p>
                <Button className="w-full h-11" onClick={() => setLocation("/login")}>Back to Sign In</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
