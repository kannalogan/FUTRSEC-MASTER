import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Shield, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useSendOtp } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api";
import { postLoginPath } from "@/lib/auth-routing";
import { motion, AnimatePresence } from "framer-motion";

type Mode = "welcome" | "email";
type Tab = "password" | "otp";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const OAUTH_PROVIDERS = [
  {
    id: "google",
    name: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    id: "github",
    name: "Continue with GitHub",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
  },
  {
    id: "microsoft",
    name: "Continue with Microsoft",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#00A4EF" d="M13 1h10v10H13z"/>
        <path fill="#7FBA00" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
      </svg>
    ),
  },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { setToken } = useAuth();

  const [mode, setMode] = useState<Mode>("welcome");
  const [tab, setTab] = useState<Tab>("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");

  const [otpContact, setOtpContact] = useState("");
  const [oauthError, setOauthError] = useState("");

  const sendOtp = useSendOtp();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const err = params.get("error");
    const provider = params.get("provider");
    if (err === "oauth_not_configured" && provider) {
      setOauthError(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured yet. Please use email to sign in or contact support.`
      );
    }
  }, [search]);

  const handleOAuth = (provider: string) => {
    window.location.href = `${BASE}/api/auth/oauth/${provider}`;
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassLoading(true);
    try {
      const data = await apiFetch<{ accessToken: string; user: { role: string; onboardingStep: string; approvalStatus: string | null } }>(
        "/api/auth/login/password",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      setToken(data.accessToken);
      setLocation(postLoginPath(data.user));
    } catch (e) {
      setPassError((e as Error).message);
    } finally {
      setPassLoading(false);
    }
  };

  const handleOtpSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpContact) return;
    const type = otpContact.includes("@") ? "email" : "phone";
    sendOtp.mutate(
      { data: { contact: otpContact, type } },
      {
        onSuccess: (res) => {
          const devOtp = (res as unknown as Record<string, unknown>).otp as string | undefined;
          setLocation(
            `/auth/verify?email=${encodeURIComponent(otpContact)}&flow=login${devOtp ? `&otp=${devOtp}` : ""}`
          );
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-none lg:w-[480px] xl:w-[540px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center glow-primary">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">FUTRSEC</span>
          </div>
          <a href="mailto:futrsec@bcbuzz.io" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            futrsec@bcbuzz.io
          </a>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 py-10 max-w-sm mx-auto w-full">
          <AnimatePresence mode="wait">

            {/* ── Welcome ────────────────────────────────────────────────── */}
            {mode === "welcome" && (
              <motion.div key="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground mb-2">
                  Welcome to FUTRSEC
                </h1>
                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                  India's cybersecurity learning, mentorship, and placement ecosystem.
                </p>

                {oauthError && (
                  <div className="mb-5 text-xs bg-warning/10 border border-warning/30 text-warning rounded-lg px-3 py-2.5 leading-relaxed">
                    {oauthError}
                  </div>
                )}

                <div className="space-y-2.5 mb-6">
                  {OAUTH_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleOAuth(p.id)}
                      className="hover-lift focus-ring w-full flex items-center gap-3 px-4 h-11 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors text-sm font-medium"
                    >
                      {p.icon}
                      {p.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button className="w-full h-11 mb-5" variant="outline" onClick={() => setMode("email")}>
                  Sign in using Email
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>

                <div className="flex items-center justify-center gap-4 text-sm mb-8">
                  <button onClick={() => setLocation("/auth/forgot-password")} className="text-muted-foreground hover:text-foreground transition-colors">
                    Forgot Password
                  </button>
                  <span className="text-border">|</span>
                  <button onClick={() => setLocation("/register")} className="text-primary font-semibold hover:underline">
                    Create Account
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Need help?{" "}
                  <a href="mailto:futrsec@bcbuzz.io" className="text-primary hover:underline">
                    futrsec@bcbuzz.io
                  </a>
                </p>
              </motion.div>
            )}

            {/* ── Email Login ─────────────────────────────────────────────── */}
            {mode === "email" && (
              <motion.div key="email" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <button
                  onClick={() => { setMode("welcome"); setPassError(""); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> All sign-in options
                </button>

                <h2 className="text-2xl font-heading font-bold tracking-tight mb-1">Sign in to FUTRSEC</h2>
                <p className="text-muted-foreground text-sm mb-6">Choose your preferred method.</p>

                <div className="flex gap-1 bg-muted/40 rounded-lg p-1 mb-6">
                  {(["password", "otp"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setPassError(""); }}
                      className={`focus-ring flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tab === t ? "bg-background elevation-1 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t === "password" ? "Password" : "OTP"}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {tab === "password" && (
                    <motion.form key="pw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handlePasswordSignIn} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus required />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <button type="button" onClick={() => setLocation("/auth/forgot-password")} className="text-xs text-primary hover:underline">
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Input id="password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {passError && (
                        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{passError}</p>
                      )}
                      <Button type="submit" className="w-full h-11" disabled={!email || !password || passLoading}>
                        {passLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sign In
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        No account?{" "}
                        <button type="button" onClick={() => setLocation("/register")} className="text-primary font-medium hover:underline">
                          Create one
                        </button>
                      </p>
                    </motion.form>
                  )}

                  {tab === "otp" && (
                    <motion.form key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleOtpSend} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="otpContact">Email or Phone Number</Label>
                        <Input
                          id="otpContact"
                          value={otpContact}
                          onChange={e => setOtpContact(e.target.value)}
                          placeholder="you@example.com or +91..."
                          autoFocus
                          required
                        />
                      </div>
                      {sendOtp.isError && (
                        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                          {(sendOtp.error as Error)?.message}
                        </p>
                      )}
                      <Button type="submit" className="w-full h-11" disabled={!otpContact || sendOtp.isPending}>
                        {sendOtp.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send OTP <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        No account?{" "}
                        <button type="button" onClick={() => setLocation("/register")} className="text-primary font-medium hover:underline">
                          Create one
                        </button>
                      </p>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col justify-end border-l border-white/10 relative overflow-hidden bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(250_40%_14%)] to-[hsl(262_60%_18%)]">
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z' fill='rgba(255,255,255,0.03)' fill-rule='evenodd'/%3E%3C/svg%3E")` }}
        />
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/25 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet/20 blur-[120px]" />
        <div className="relative p-12">
          <div className="mb-10 space-y-5">
            {[
              { stat: "10,000+", label: "Students trained" },
              { stat: "95%", label: "Placement rate" },
              { stat: "500+", label: "Hiring partners" },
            ].map((s) => (
              <div key={s.stat} className="flex items-baseline gap-3">
                <span className="text-3xl font-heading font-bold text-white">{s.stat}</span>
                <span className="text-white/60 text-sm">{s.label}</span>
              </div>
            ))}
          </div>
          <blockquote className="space-y-4 border-t border-white/10 pt-8">
            <p className="text-lg font-medium leading-relaxed text-white/90 font-heading">
              "The most structured approach to cybersecurity training. It's not just CTFs — it's the methodology you need for enterprise security."
            </p>
            <footer className="text-white/60">
              <div className="font-bold text-white text-sm">Security Director</div>
              <div className="text-xs mt-0.5">Fortune 500 Enterprise</div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
