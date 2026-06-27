import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { Shield, Loader2, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { postLoginPath } from "@/lib/auth-routing";

const OTP_EXPIRY_SECS = 300;

export default function VerifyOTP() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email") ?? "";
  const devOtp = params.get("otp") ?? "";
  const flow = params.get("flow") ?? "login";

  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendOk, setResendOk] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECS);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const verifyOtp = useVerifyOtp();

  useEffect(() => {
    if (devOtp) {
      setDigits(devOtp.split("").slice(0, 6));
    }
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const handleDigit = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      refs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const otp = digits.join("");

  const handleVerify = () => {
    if (otp.length !== 6) return;
    setError("");
    verifyOtp.mutate(
      { data: { contact: email, otp } },
      {
        onSuccess: (data) => {
          setToken(data.accessToken);
          setLocation(postLoginPath(data.user));
        },
        onError: (e) => setError((e as Error).message),
      }
    );
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendOk(false);
    setError("");
    try {
      await apiFetch("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ contact: email, type: "email" }),
      });
      setTimeLeft(OTP_EXPIRY_SECS);
      setResendOk(true);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResendLoading(false);
    }
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b">
        <button onClick={() => setLocation(flow === "register" ? "/register" : "/login")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center glow-primary">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="font-heading font-bold text-xl tracking-tight">FUTRSEC</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Shield className="h-7 w-7 text-primary" />
          </div>

          <h1 className="text-2xl font-heading font-bold mb-2">Verify your email</h1>
          <p className="text-muted-foreground text-sm mb-1">We sent a 6-digit code to</p>
          <p className="font-semibold text-sm mb-6 truncate">{email}</p>

          {devOtp && (
            <div className="mb-5 text-xs bg-warning/10 border border-warning/30 text-warning rounded-lg px-3 py-2">
              Dev mode — OTP auto-filled from response
            </div>
          )}

          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background focus:outline-none focus:border-primary transition-colors ${d ? "border-primary bg-primary/5" : "border-border"}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}
          {resendOk && (
            <p className="text-sm text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2 mb-4 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> New OTP sent to your email
            </p>
          )}

          <Button className="w-full h-11 mb-4" disabled={otp.length !== 6 || verifyOtp.isPending} onClick={handleVerify}>
            {verifyOtp.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify & Continue
          </Button>

          <div className="flex items-center justify-center gap-3 text-sm">
            {timeLeft > 0 ? (
              <span className="text-muted-foreground">Resend in <span className="font-mono font-semibold text-foreground">{mm}:{ss}</span></span>
            ) : (
              <button onClick={handleResend} disabled={resendLoading} className="text-primary hover:underline flex items-center gap-1.5 disabled:opacity-50">
                {resendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Resend OTP
              </button>
            )}
            <span className="text-border">|</span>
            <button onClick={() => setLocation(flow === "register" ? "/register" : "/login")} className="text-muted-foreground hover:text-foreground">
              Change email
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
