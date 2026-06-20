import { useState } from "react";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Shield, ArrowRight, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const IS_DEV = import.meta.env.DEV;

export default function Login() {
  const [step, setStep] = useState<"contact" | "otp">("contact");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [_, setLocation] = useLocation();
  const { setToken } = useAuth();

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    sendOtp.mutate(
      { data: { contact, type: contact.includes("@") ? "email" : "phone" } },
      {
        onSuccess: (data) => {
          const devCode = (data as Record<string, unknown>).otp as string | undefined;
          if (devCode) {
            setDevOtp(devCode);
            setOtp(devCode);
          }
          setStep("otp");
        },
      }
    );
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    verifyOtp.mutate(
      { data: { contact, otp } },
      {
        onSuccess: (data) => {
          setToken(data.accessToken);

          const onboardingStep = data.user.onboardingStep;
          if (onboardingStep === "consent") setLocation("/onboarding/consent");
          else if (onboardingStep === "profile") setLocation("/onboarding/profile");
          else if (onboardingStep === "track_selection") setLocation("/onboarding/tracks");
          else if (onboardingStep === "pre_assessment") setLocation("/onboarding/assessment");
          else setLocation("/dashboard");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full lg:w-1/2">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-2 font-heading font-bold text-2xl tracking-tight mb-10">
            <Shield className="h-8 w-8 text-primary" />
            FUTRSEC
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              {step === "contact" ? "Sign in to FUTRSEC" : "Verify OTP"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === "contact"
                ? "Enter your email or phone number to continue."
                : `We sent a 6-digit code to ${contact}`}
            </p>
          </div>

          {step === "contact" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              {IS_DEV && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <Terminal className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Dev mode</strong> — OTP will be auto-filled and shown in the API response.
                    No email is sent.
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="contact">Email or Phone Number</Label>
                <Input
                  id="contact"
                  type="text"
                  placeholder="name@example.com or +91..."
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  autoFocus
                  className="h-12"
                />
              </div>
              {sendOtp.isError && (
                <p className="text-sm text-destructive">
                  {(sendOtp.error as Error)?.message ?? "Failed to send OTP. Please try again."}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={sendOtp.isPending || !contact}
              >
                {sendOtp.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {IS_DEV && devOtp && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <Terminal className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>Dev OTP:</strong>{" "}
                    <span className="font-mono font-bold tracking-widest text-sm">{devOtp}</span>
                    {" "}— auto-filled below
                  </span>
                </div>
              )}
              <div className="space-y-2 flex flex-col items-center">
                <Label className="sr-only">One-Time Password</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-lg" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-lg" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-lg" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-lg" />
                    <InputOTPSlot index={4} className="h-14 w-12 text-lg" />
                    <InputOTPSlot index={5} className="h-14 w-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {verifyOtp.isError && (
                <p className="text-sm text-destructive text-center">
                  {(verifyOtp.error as Error)?.message ?? "Invalid OTP. Please try again."}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={verifyOtp.isPending || otp.length !== 6}
              >
                {verifyOtp.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Verify & Sign In
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setStep("contact"); setDevOtp(null); setOtp(""); }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Use a different email or phone
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="hidden lg:block relative w-0 flex-1 bg-sidebar border-l border-sidebar-border overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGMtMi43NiAwLTUtMi4yNC01LTVzMi4yNC01IDUtNSA1IDIuMjQgNSA1LTIuMjQgNS01IDV6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-50" />
        <div className="absolute bottom-12 left-12 right-12 text-sidebar-foreground">
          <blockquote className="space-y-6">
            <p className="text-2xl font-medium leading-relaxed font-heading">
              "The most structured approach to cybersecurity training. It's not just CTFs; it's the exact methodology you need for enterprise security."
            </p>
            <footer className="text-sidebar-foreground/70">
              <div className="font-bold text-white">Security Director</div>
              <div className="text-sm">Fortune 500 Enterprise</div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
