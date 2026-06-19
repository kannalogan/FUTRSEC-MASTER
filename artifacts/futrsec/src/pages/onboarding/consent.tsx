import { useState } from "react";
import { useCaptureConsent } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Consent() {
  const [_, setLocation] = useLocation();
  const [marketing, setMarketing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [thirdParty, setThirdParty] = useState(false);
  
  const captureConsent = useCaptureConsent();

  const handleContinue = () => {
    captureConsent.mutate(
      { data: { dataProcessing: true, marketing, analytics, thirdParty } },
      {
        onSuccess: () => {
          setLocation("/onboarding/profile");
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Your Data, Your Control</h1>
          <p className="text-muted-foreground mt-2">
            In compliance with DPDP, please configure your privacy preferences before continuing.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg">Required Consent</CardTitle>
            <CardDescription>Necessary for the platform to function</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base font-semibold">Core Data Processing</Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We need to process your basic profile data and learning progress to provide our services. This cannot be disabled.
                </p>
              </div>
              <Switch checked disabled />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card">
            <div className="space-y-1">
              <Label htmlFor="analytics" className="text-base font-semibold cursor-pointer">Analytics & Performance</Label>
              <p className="text-sm text-muted-foreground">
                Help us improve the platform by sharing anonymous usage data.
              </p>
            </div>
            <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} />
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card">
            <div className="space-y-1">
              <Label htmlFor="marketing" className="text-base font-semibold cursor-pointer">Marketing Communications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new tracks, labs, and career opportunities.
              </p>
            </div>
            <Switch id="marketing" checked={marketing} onCheckedChange={setMarketing} />
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card">
            <div className="space-y-1">
              <Label htmlFor="thirdParty" className="text-base font-semibold cursor-pointer">Third-party Placements</Label>
              <p className="text-sm text-muted-foreground">
                Allow us to share your profile and achievements with verified hiring partners.
              </p>
            </div>
            <Switch id="thirdParty" checked={thirdParty} onCheckedChange={setThirdParty} />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button size="lg" className="w-full sm:w-auto" onClick={handleContinue} disabled={captureConsent.isPending}>
            {captureConsent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Acknowledge & Continue
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
