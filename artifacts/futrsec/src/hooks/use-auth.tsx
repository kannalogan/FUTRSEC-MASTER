import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey, UserProfile } from "@workspace/api-client-react";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("futrsec_token"));
  
  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("futrsec_token", newToken);
    } else {
      localStorage.removeItem("futrsec_token");
    }
    setTokenState(newToken);
  };

  const logout = () => setToken(null);

  const { data: user, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
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
