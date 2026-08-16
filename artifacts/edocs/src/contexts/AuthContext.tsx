import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { setAuthTokenGetter, useGetMe, UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SessionExpiryBanner } from "@/components/SessionExpiryBanner";

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refetchUser: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

/** Decode a JWT and return its expiry as a Unix timestamp (ms), or null. */
function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("edocs_token"));
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Banner state
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Refs to hold timer IDs so we can clear on token change
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("edocs_token"));
  }, []);

  const { data: user, isLoading: isUserLoading, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  /** Clear all expiry timers. */
  function clearTimers() {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    expiryTimerRef.current = null;
    countdownRef.current = null;
  }

  /** Start countdown interval, updating secondsLeft every second. */
  function startCountdown(expiresAtMs: number) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  }

  /** Schedule the warning banner and the forced logout for a given token. */
  function scheduleExpiryTimers(tkn: string) {
    clearTimers();
    setShowWarning(false);
    setDismissed(false);

    const expiresAt = parseJwtExpiry(tkn);
    if (!expiresAt) return;

    const now = Date.now();
    const msUntilExpiry = expiresAt - now;

    if (msUntilExpiry <= 0) {
      // Already expired — logout immediately
      logout();
      return;
    }

    const msUntilWarning = msUntilExpiry - WARNING_BEFORE_EXPIRY_MS;

    if (msUntilWarning > 0) {
      // Token has more than 5 minutes left — schedule warning
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        setDismissed(false);
        startCountdown(expiresAt);
      }, msUntilWarning);
    } else {
      // Less than 5 min left already — show warning immediately
      setShowWarning(true);
      setDismissed(false);
      startCountdown(expiresAt);
    }

    // Schedule forced logout at expiry
    expiryTimerRef.current = setTimeout(() => {
      clearTimers();
      setShowWarning(false);
      // Force logout and notify
      localStorage.removeItem("edocs_token");
      setAuthTokenGetter(() => null);
      setToken(null);
      queryClient.clear();
      toast.error("Session expired. Please sign in again.", { duration: 6000 });
      setLocation("/login");
    }, msUntilExpiry);
  }

  /** Called when a new token arrives (login or refresh). */
  const login = (newToken: string) => {
    localStorage.setItem("edocs_token", newToken);
    setAuthTokenGetter(() => newToken);
    setToken(newToken);
    scheduleExpiryTimers(newToken);
  };

  const logout = () => {
    clearTimers();
    setShowWarning(false);
    localStorage.removeItem("edocs_token");
    setAuthTokenGetter(() => null);
    setToken(null);
    queryClient.clear();
    setLocation("/login");
  };

  /** Silently refresh the token via POST /api/auth/refresh. */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const currentToken = localStorage.getItem("edocs_token");
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Refresh failed");
      const { token: newToken } = await response.json();
      login(newToken);
      setShowWarning(false);
      toast.success("Session extended successfully.");
    } catch {
      toast.error("Could not extend session. Please sign in again.");
      logout();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Schedule timers whenever the token changes (on mount or login)
  useEffect(() => {
    if (token) {
      scheduleExpiryTimers(token);
    } else {
      clearTimers();
      setShowWarning(false);
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isLoading = !!token && isUserLoading;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout, refetchUser: refetch }}>
      {showWarning && !dismissed && (
        <SessionExpiryBanner
          secondsLeft={secondsLeft}
          onRefresh={handleRefresh}
          onDismiss={() => setDismissed(true)}
          isRefreshing={isRefreshing}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
