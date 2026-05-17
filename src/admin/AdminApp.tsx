import { useState, useEffect } from "react";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar, { AdminTab } from "./components/AdminSidebar";
import Dashboard      from "./pages/Dashboard";
import Verification   from "./pages/Verification";
import UserManagement from "./pages/UserManagement";
import { Problems, Applications, CollabRequests, Reports, Ratings } from "./pages/ContentPages";
import Analytics      from "./pages/Analytics";
import { Announcements, AdminSettings } from "./pages/AnnouncementsSettings";
import { adminApi, AdminStats } from "./lib/adminApi";
import { Loader2, ShieldOff } from "lucide-react";

// ─── Gate: must be logged in AND admin ───────────────────────────────────────
const AdminGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        <span className="text-blue-400 text-sm">Verifying admin access…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900 border border-blue-800">
          <ShieldOff className="h-8 w-8 text-blue-500" />
        </div>
        <h1 className="text-xl font-bold text-white">Not signed in</h1>
        <p className="text-blue-400 text-sm max-w-sm">You need to be signed into CoHustle to access the admin panel.</p>
        <a href="/" className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-all">
          Go to CoHustle
        </a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-900/50 border border-red-800">
          <ShieldOff className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="text-blue-400 text-sm max-w-sm">
          Your account <span className="text-blue-200">{user.email}</span> does not have admin privileges.
          Add it to the <code className="bg-blue-900 px-1 rounded text-blue-300 text-xs">ADMIN_EMAILS</code> env variable on the backend.
        </p>
        <a href="/" className="mt-2 inline-flex items-center gap-2 rounded-xl border border-blue-700 px-6 py-2.5 text-sm font-semibold text-blue-300 hover:text-white hover:border-blue-500 transition-all">
          Back to CoHustle
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

// ─── Inner shell (has access to auth) ────────────────────────────────────────
const AdminShell = () => {
  const [tab,         setTab]         = useState<AdminTab>("dashboard");
  const [stats,       setStats]       = useState<AdminStats | null>(null);
  const [statsLoading,setStatsLoading]= useState(true);

  const refreshStats = () => {
    adminApi.getStats()
      .then(({ stats: s }) => setStats(s))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => { refreshStats(); }, []);

  // Refresh stats after any action that could change counts
  const gotoAndRefresh = (t: AdminTab) => {
    setTab(t);
    refreshStats();
  };

  const badges = {
    verification: stats?.pendingVerifications ?? 0,
    reports:      stats?.openReports ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar active={tab} onChange={setTab} badges={badges} />
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden max-w-full">
          {tab === "dashboard"     && <Dashboard stats={stats} loading={statsLoading} goto={gotoAndRefresh} />}
          {tab === "verification"  && <Verification />}
          {tab === "users"         && <UserManagement />}
          {tab === "problems"      && <Problems />}
          {tab === "applications"  && <Applications />}
          {tab === "reports"       && <Reports />}
          {tab === "collab"        && <CollabRequests />}
          {tab === "analytics"     && <Analytics stats={stats} />}
          {tab === "announcements" && <Announcements />}
          {tab === "settings"      && <AdminSettings />}
        </main>
      </div>
    </div>
  );
};

// ─── Root export ──────────────────────────────────────────────────────────────
const AdminApp = () => (
  <AdminAuthProvider>
    <AdminGate>
      <AdminShell />
    </AdminGate>
  </AdminAuthProvider>
);

export default AdminApp;
