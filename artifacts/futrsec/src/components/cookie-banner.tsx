import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "futrsec_cookie_consent";

type CookiePrefs = { necessary: boolean; analytics: boolean; marketing: boolean; functional: boolean };

export function CookieBanner() {
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const mutation = useMutation({
    mutationFn: (prefs: CookiePrefs) =>
      apiFetch<CookiePrefs>("/api/consent/cookies", { method: "POST", body: JSON.stringify(prefs) }),
    onSuccess: () => {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      qc.invalidateQueries({ queryKey: ["consent/cookies"] });
      qc.invalidateQueries({ queryKey: ["consent/history"] });
      setVisible(false);
    },
  });

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-border/60 bg-card shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Cookie className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">We value your privacy</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            We use cookies to keep you signed in and improve your experience. Manage choices anytime in the{" "}
            <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Center</Link>.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ necessary: true, analytics: false, marketing: false, functional: false })}
          >
            Reject Non-Essential
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ necessary: true, analytics: true, marketing: true, functional: true })}
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
