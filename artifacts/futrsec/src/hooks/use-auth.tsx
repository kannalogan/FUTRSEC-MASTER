import { createContext, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey, UserProfile, setAuthTokenGetter } from "@workspace/api-client-react";

// Wire the token getter ONCE at module load time so every Orval-generated
// hook (useCaptureConsent, useGetMe, etc.) automatically attaches
// "Authorization: Bearer <token>" without any per-call plumbing.
setAuthTokenGetter(() => localStorage.getItem("futrsec_token"));

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("futrsec_token"));

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("futrsec_token", newToken);
    } else {
      localStorage.removeItem("futrsec_token");
    }
    // Drop any cached /auth/me from a prior session so the new token always
    // re-fetches the live user (role + approvalStatus). Without this, a stale
    // cached user (e.g. a tpo/employer that was "pending" before an admin
    // approval) can survive a logout/login within the same SPA session and
    // wrongly redirect an approved account back to the pending screen.
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    setTokenState(newToken);
  };

  const logout = () => setToken(null);

  const { data: user, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
      // Auth gating must reflect live server state; never serve stale /auth/me.
      staleTime: 0,
      refetchOnMount: "always",
    }
  });

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
