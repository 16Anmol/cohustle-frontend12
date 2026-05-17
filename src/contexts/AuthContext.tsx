import {
  createContext, useContext, ReactNode,
  useState, useEffect, useCallback, useRef
} from "react";
import { useNavigate } from "react-router-dom";
import {
  authApi, profileApi, saveToken, clearToken,
  type FullProfile, type User
} from "@/lib/api";

type AuthContextType = {
  user: User | null;
  profile: FullProfile | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Poll interval — check for suspension / profile changes every 30 seconds
const POLL_INTERVAL_MS = 30_000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Core fetch ─────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const p = await profileApi.getMe();
      setProfile(p);
      setUser({
        id:                 p.id,
        email:              p.email,
        fullName:           p.fullName,
        avatar:             p.avatar,
        role:               p.role,
        onboarded:          p.onboarded,
        tags:               p.tags,
        suspended:          (p as any).suspended          ?? false,
        suspensionReason:   (p as any).suspensionReason   ?? "",
        suspendedAt:        (p as any).suspendedAt        ?? null,
        verificationStatus: (p as any).verificationStatus ?? "not_required",
      });
      document.documentElement.setAttribute(
        "data-theme",
        p.role === "freelancer" ? "freelancer" : "startup"
      );
      return true; // logged in
    } catch {
      setUser(null);
      setProfile(null);
      return false; // not logged in
    }
  }, []);

  // ── On mount: grab token from URL if present, then fetch ──────────────────
  useEffect(() => {
    const params       = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
      saveToken(tokenFromUrl);
      window.history.replaceState({}, "", window.location.pathname);
    }

    setLoading(true);
    fetchProfile().finally(() => setLoading(false));
  }, []);

  // ── Poll every 30s so suspension / reinstatement shows without refresh ─────
  useEffect(() => {
    // Only poll when user is logged in
    if (!user) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(() => {
      fetchProfile();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [!!user]); // restart poll when login state changes

  const signInWithGoogle = () => {
    window.location.href = authApi.googleLoginUrl();
  };

  const signOut = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    try { await authApi.signOut(); } catch {}
    clearToken();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile: fetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
