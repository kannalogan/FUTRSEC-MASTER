import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Consent from "@/pages/onboarding/consent";
import Profile from "@/pages/onboarding/profile";
import Tracks from "@/pages/onboarding/tracks";
import Assessment from "@/pages/onboarding/assessment";
import Complete from "@/pages/onboarding/complete";
import Privacy from "@/pages/privacy";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, requireOnboarding = false, ...rest }: any) {
  const { token, user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  if (!token) return <Redirect to="/login" />;
  
  // Basic onboarding step routing logic could go here if needed, 
  // but we'll let components handle it for simplicity in this demo
  
  return <Layout><Component {...rest} /></Layout>;
}

function OnboardingRoute({ component: Component, ...rest }: any) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  if (!token) return <Redirect to="/login" />;
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/onboarding/consent"><OnboardingRoute component={Consent} /></Route>
      <Route path="/onboarding/profile"><OnboardingRoute component={Profile} /></Route>
      <Route path="/onboarding/tracks"><OnboardingRoute component={Tracks} /></Route>
      <Route path="/onboarding/assessment"><OnboardingRoute component={Assessment} /></Route>
      <Route path="/onboarding/complete"><OnboardingRoute component={Complete} /></Route>
      <Route path="/privacy"><ProtectedRoute component={Privacy} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
