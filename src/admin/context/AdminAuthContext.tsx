import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface AdminAuthUser {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
}

interface AdminAuthCtx {
  user: AdminAuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => void;
}

const Ctx = createContext<AdminAuthCtx | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<AdminAuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cohustle_token");
    if (!token) { setLoading(false); return; }

    fetch(`${BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data?.email) {
          setUser({ id: data.id ?? data._id, email: data.email, fullName: data.fullName, avatar: data.avatar });
          // Check admin access by hitting a guarded endpoint
          fetch(`${BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => { if (r.ok) setIsAdmin(true); })
            .catch(() => {})
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const signOut = () => {
    localStorage.removeItem("cohustle_token");
    setUser(null);
    setIsAdmin(false);
    window.location.href = "/";
  };

  return <Ctx.Provider value={{ user, loading, isAdmin, signOut }}>{children}</Ctx.Provider>;
};

export const useAdminAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return ctx;
};
