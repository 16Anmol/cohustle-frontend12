import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import {
  adminApiV2,
  type VerificationEntry,
  type Report,
  type Announcement,
  type AdminStatsExtended,
  type User,
  type Problem,
  type Application,
  type CollabRequest,
  type Rating,
  type AnalyticsData,
} from "@/lib/api";
import {
  Loader2, Trash2, Users, FileText, Star, BarChart3, ShieldAlert,
  CheckCircle2, XCircle, Clock, Eye, Search, Bell, Settings,
  TrendingUp, AlertTriangle, MessageSquare, Handshake, Building2,
  UserCheck, ChevronRight, Megaphone, Shield, Activity, Ban,
  RotateCcw, Flag, RefreshCw, ExternalLink, Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab =
  | "dashboard" | "verification" | "users" | "problems"
  | "applications" | "reports" | "collab" | "analytics"
  | "announcements" | "settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function VerBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:      "bg-amber-100 text-amber-700 border-amber-200",
    approved:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected:     "bg-red-100 text-red-700 border-red-200",
    more_info:    "bg-blue-100 text-blue-700 border-blue-200",
    not_required: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    pending: "Pending", approved: "Approved", rejected: "Rejected",
    more_info: "Need Info", not_required: "N/A",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? map.not_required}`}>
      {labels[status] ?? status}
    </span>
  );
}

function Avatar({ name, avatar, size = "md" }: { name?: string; avatar?: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  if (avatar) return <img src={avatar} className={`${cls} rounded-full object-cover`} alt="" />;
  return (
    <div className={`${cls} rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const navItems = (badges: Record<string, number>) => [
  { id: "dashboard"     as Tab, label: "Dashboard",          icon: BarChart3 },
  { id: "verification"  as Tab, label: "Verification Queue", icon: UserCheck,    badge: badges.verification },
  { id: "users"         as Tab, label: "User Management",    icon: Users },
  { id: "problems"      as Tab, label: "Problem Posts",      icon: FileText },
  { id: "applications"  as Tab, label: "Applications",       icon: Handshake },
  { id: "reports"       as Tab, label: "Reports & Disputes", icon: Flag,         badge: badges.reports },
  { id: "collab"        as Tab, label: "Collab Requests",    icon: MessageSquare },
  { id: "analytics"     as Tab, label: "Analytics",          icon: TrendingUp },
  { id: "announcements" as Tab, label: "Announcements",      icon: Megaphone },
  { id: "settings"      as Tab, label: "Settings",           icon: Settings },
];

// ─── Main component ───────────────────────────────────────────────────────────
const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<AdminStatsExtended | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Per-tab data
  const [verifications, setVerifications]   = useState<VerificationEntry[]>([]);
  const [users,         setUsers]           = useState<User[]>([]);
  const [problems,      setProblems]        = useState<Problem[]>([]);
  const [applications,  setApplications]    = useState<Application[]>([]);
  const [collabs,       setCollabs]         = useState<CollabRequest[]>([]);
  const [ratings,       setRatings]         = useState<Rating[]>([]);
  const [reports,       setReports]         = useState<Report[]>([]);
  const [announcements, setAnnouncements]   = useState<Announcement[]>([]);
  const [analytics,     setAnalytics]       = useState<AnalyticsData | null>(null);

  // Loading per tab
  const [tabLoading, setTabLoading] = useState(false);

  // Filters
  const [search,         setSearch]         = useState("");
  const [verFilter,      setVerFilter]      = useState("pending");
  const [problemFilter,  setProblemFilter]  = useState("");
  const [reportFilter,   setReportFilter]   = useState("open");
  const [appFilter,      setAppFilter]      = useState("");
  const [collabFilter,   setCollabFilter]   = useState("");

  // Verification modal
  const [selectedVer,  setSelectedVer]  = useState<VerificationEntry | null>(null);
  const [rejectMode,   setRejectMode]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Announcements
  const [annMsg,    setAnnMsg]    = useState("");
  const [annTarget, setAnnTarget] = useState<"all" | "startup" | "freelancer">("all");

  // Settings
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowSignups,    setAllowSignups]    = useState(true);

  // ─── Load stats on mount ────────────────────────────────────────────────────
  useEffect(() => {
    adminApiV2.getStats()
      .then(({ stats }) => setStats(stats))
      .catch(() => toast({ title: "Could not load stats", variant: "destructive" }))
      .finally(() => setLoadingStats(false));
  }, []);

  // ─── Load data when tab changes ─────────────────────────────────────────────
  const loadTab = useCallback(async (tab: Tab) => {
    setTabLoading(true);
    try {
      if (tab === "verification") {
        const { verifications: v } = await adminApiV2.getVerifications({ status: verFilter });
        setVerifications(v);
      } else if (tab === "users") {
        const { users: u } = await adminApiV2.getUsers({ search });
        setUsers(u);
      } else if (tab === "problems") {
        const { problems: p } = await adminApiV2.getProblems({ status: problemFilter, search });
        setProblems(p);
      } else if (tab === "applications") {
        const { applications: a } = await adminApiV2.getApplications({ status: appFilter });
        setApplications(a);
      } else if (tab === "collab") {
        const { collabRequests: c } = await adminApiV2.getCollabRequests({ status: collabFilter });
        setCollabs(c);
      } else if (tab === "reports") {
        const { reports: r } = await adminApiV2.getReports({ status: reportFilter });
        setReports(r);
      } else if (tab === "announcements") {
        const { announcements: a } = await adminApiV2.getAnnouncements();
        setAnnouncements(a);
        const { ratings: r } = await adminApiV2.getRatings();
        setRatings(r);
      } else if (tab === "analytics") {
        const data = await adminApiV2.getAnalytics();
        setAnalytics(data);
      }
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setTabLoading(false);
    }
  }, [verFilter, search, problemFilter, appFilter, collabFilter, reportFilter]);

  useEffect(() => { loadTab(activeTab); }, [activeTab, verFilter, reportFilter]);

  const goto = (tab: Tab) => { setActiveTab(tab); setSearch(""); };

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async (v: VerificationEntry) => {
    try {
      await adminApiV2.approveVerification(v._id);
      setVerifications(prev => prev.map(x => x._id === v._id ? { ...x, verificationStatus: "approved" } : x));
      setSelectedVer(null);
      toast({ title: "✅ Startup approved" });
      adminApiV2.getStats().then(({ stats }) => setStats(stats));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleReject = async (v: VerificationEntry) => {
    if (!rejectReason.trim()) { toast({ title: "Please enter a rejection reason", variant: "destructive" }); return; }
    try {
      await adminApiV2.rejectVerification(v._id, rejectReason);
      setVerifications(prev => prev.map(x => x._id === v._id ? { ...x, verificationStatus: "rejected", verificationRejectionReason: rejectReason } : x));
      setSelectedVer(null); setRejectMode(false); setRejectReason("");
      toast({ title: "❌ Startup rejected" });
      adminApiV2.getStats().then(({ stats }) => setStats(stats));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleMoreInfo = async (v: VerificationEntry) => {
    try {
      await adminApiV2.requestMoreInfo(v._id);
      setVerifications(prev => prev.map(x => x._id === v._id ? { ...x, verificationStatus: "more_info" } : x));
      setSelectedVer(null);
      toast({ title: "ℹ️ Info requested from startup" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await adminApiV2.deleteUser(id);
      setUsers(prev => prev.filter(u => (u as any)._id !== id && u.id !== id));
      toast({ title: "User deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSuspend = async (u: any) => {
    try {
      const { user: updated } = await adminApiV2.suspendUser((u as any)._id ?? u.id, !u.suspended);
      setUsers(prev => prev.map(x => ((x as any)._id ?? x.id) === ((u as any)._id ?? u.id) ? { ...x, suspended: !u.suspended } : x));
      toast({ title: u.suspended ? "User reinstated" : "User suspended" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (!confirm("Delete this problem?")) return;
    try {
      await adminApiV2.deleteProblem(id);
      setProblems(prev => prev.filter(p => p._id !== id));
      toast({ title: "Problem deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteCollab = async (id: string) => {
    if (!confirm("Delete this collab request?")) return;
    try {
      await adminApiV2.deleteCollabRequest(id);
      setCollabs(prev => prev.filter(c => c._id !== id));
      toast({ title: "Collab request deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleReport = async (id: string, status: "resolved" | "dismissed") => {
    try {
      const { report } = await adminApiV2.updateReport(id, status);
      setReports(prev => prev.map(r => r._id === id ? report : r));
      toast({ title: status === "resolved" ? "Report resolved" : "Report dismissed" });
      adminApiV2.getStats().then(({ stats }) => setStats(stats));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSendAnnouncement = async () => {
    if (!annMsg.trim()) return;
    try {
      const { announcement } = await adminApiV2.sendAnnouncement(annMsg.trim(), annTarget);
      setAnnouncements(prev => [announcement, ...prev]);
      setAnnMsg("");
      toast({ title: "📢 Announcement sent" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const badges = {
    verification: stats?.pendingVerifications ?? 0,
    reports:      stats?.openReports ?? 0,
  };

  // ─── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">

        {/* ══ Sidebar ══ */}
        <aside className="hidden md:flex w-64 min-h-[calc(100vh-64px)] flex-col border-r border-border bg-card sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Admin Console</p>
                <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {navItems(badges).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => goto(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </span>
                  {!!item.badge && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${isActive ? "bg-white/20 text-white" : "bg-destructive/10 text-destructive"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 text-emerald-500" />
              <span>System online</span>
            </div>
          </div>
        </aside>

        {/* ══ Main ══ */}
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">

          {/* ──────────────── DASHBOARD ──────────────── */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Platform overview at a glance.</p>
              </div>

              {/* Alert banners */}
              {!!stats?.pendingVerifications && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">
                      {stats.pendingVerifications} startup{stats.pendingVerifications > 1 ? "s" : ""} awaiting verification
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => goto("verification")}>
                    Review <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
              {!!stats?.openReports && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                  <Flag className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">{stats.openReports} open report{stats.openReports > 1 ? "s" : ""} to review</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={() => goto("reports")}>
                    Review <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}

              {loadingStats ? <LoadingSpinner /> : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Users",       value: stats?.totalUsers,            icon: Users,     color: "text-blue-500",   bg: "bg-blue-50" },
                    { label: "Startups",           value: stats?.startups,              icon: Building2, color: "text-violet-500", bg: "bg-violet-50" },
                    { label: "Freelancers",        value: stats?.freelancers,           icon: UserCheck, color: "text-emerald-500",bg: "bg-emerald-50" },
                    { label: "Problems Posted",    value: stats?.totalProblems,         icon: FileText,  color: "text-orange-500", bg: "bg-orange-50" },
                    { label: "Open Problems",      value: stats?.openProblems,          icon: Clock,     color: "text-yellow-500", bg: "bg-yellow-50" },
                    { label: "Applications",       value: stats?.totalApplications,     icon: Handshake, color: "text-pink-500",   bg: "bg-pink-50" },
                    { label: "Active Collabs",     value: stats?.acceptedApplications,  icon: Activity,  color: "text-teal-500",   bg: "bg-teal-50" },
                    { label: "Suspended Users",    value: stats?.suspended,             icon: Ban,       color: "text-red-500",    bg: "bg-red-50" },
                    { label: "Pending Verif.",     value: stats?.pendingVerifications,  icon: ShieldAlert,color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "Open Reports",       value: stats?.openReports,           icon: Flag,      color: "text-rose-500",   bg: "bg-rose-50" },
                    { label: "Collab Requests",    value: stats?.collabRequests,        icon: MessageSquare,color:"text-indigo-500",bg:"bg-indigo-50"},
                    { label: "Ratings",            value: stats?.ratings,               icon: Star,      color: "text-amber-500",  bg: "bg-amber-50" },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <Card key={s.label} className="border border-border">
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                            <Icon className={`h-5 w-5 ${s.color}`} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{s.value ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Review Verifications", icon: UserCheck,  tab: "verification" as Tab },
                    { label: "Manage Reports",       icon: Flag,        tab: "reports"      as Tab },
                    { label: "Send Announcement",    icon: Megaphone,   tab: "announcements"as Tab },
                    { label: "User Management",      icon: Users,       tab: "users"        as Tab },
                  ].map(a => {
                    const Icon = a.icon;
                    return (
                      <button key={a.label} onClick={() => goto(a.tab)}
                        className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm font-medium text-foreground transition-all hover:bg-muted hover:border-primary/30">
                        <Icon className="h-4 w-4" />{a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── VERIFICATION QUEUE ──────────────── */}
          {activeTab === "verification" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Verification Queue</h1>
                  <p className="text-muted-foreground mt-1">Review startup ID proofs and certificates.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadTab("verification")}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {["pending", "approved", "rejected", "more_info", "all"].map(s => (
                  <button key={s} onClick={() => setVerFilter(s === "all" ? "" : s)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${
                      (verFilter === s || (s === "all" && !verFilter))
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}>
                    {s === "more_info" ? "Need Info" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {tabLoading ? <LoadingSpinner /> : verifications.length === 0 ? (
                <EmptyState icon={UserCheck} text="No startups in this category." />
              ) : (
                <div className="space-y-4">
                  {verifications.map(v => (
                    <Card key={v._id} className={`border transition-all ${v.verificationStatus === "pending" ? "border-amber-200 bg-amber-50/20" : "border-border"}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-4">
                            <Avatar name={v.fullName} avatar={v.avatar} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground">{v.profile?.startupName ?? v.fullName}</p>
                                <VerBadge status={v.verificationStatus} />
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{v.fullName} · {v.email}</p>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {v.profile?.industry && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{v.profile.industry}</span>}
                                {v.profile?.fundingStage && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{v.profile.fundingStage}</span>}
                                {v.profile?.location && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{v.profile.location}</span>}
                              </div>
                              {v.verificationRejectionReason && (
                                <p className="text-xs text-red-600 mt-1 italic">Reason: {v.verificationRejectionReason}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">Registered: {new Date(v.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedVer(v); setRejectMode(false); setRejectReason(""); }}>
                              <Eye className="h-4 w-4 mr-1" /> View Docs
                            </Button>
                            {v.verificationStatus === "pending" && (
                              <>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(v)}>
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleMoreInfo(v)}>
                                  <RefreshCw className="h-4 w-4 mr-1" /> Need Info
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                                  onClick={() => { setSelectedVer(v); setRejectMode(true); }}>
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Document modal */}
              {selectedVer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setSelectedVer(null); setRejectMode(false); }}>
                  <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-6 border-b border-border">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{selectedVer.profile?.startupName ?? selectedVer.fullName}</h2>
                        <p className="text-sm text-muted-foreground">{selectedVer.fullName} · {selectedVer.email}</p>
                      </div>
                      <VerBadge status={selectedVer.verificationStatus} />
                    </div>
                    <div className="p-6 space-y-5">

                      {/* Profile details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          ["Industry",     selectedVer.profile?.industry],
                          ["Funding Stage",selectedVer.profile?.fundingStage],
                          ["Location",     selectedVer.profile?.location],
                          ["Team Size",    selectedVer.profile?.teamSize],
                          ["Website",      selectedVer.profile?.website],
                        ].filter(([, v]) => v).map(([k, v]) => (
                          <div key={k as string}>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{k as string}</p>
                            <p className="text-foreground mt-0.5">{v as string}</p>
                          </div>
                        ))}
                      </div>
                      {selectedVer.profile?.description && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Description</p>
                          <p className="text-sm text-foreground">{selectedVer.profile.description}</p>
                        </div>
                      )}

                      {/* Documents */}
                      {[
                        ["Identity Proof",       selectedVer.profile?.identityProof],
                        ["Company Document",     selectedVer.profile?.companyDocument],
                        ["Pitch Deck",           selectedVer.profile?.pitchDeck],
                      ].filter(([, url]) => url).map(([label, url]) => (
                        <div key={label as string}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label as string}</p>
                          <a href={url as string} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-primary hover:bg-muted transition-all">
                            <ExternalLink className="h-4 w-4 shrink-0" />
                            Open document
                          </a>
                        </div>
                      ))}
                      {!selectedVer.profile?.identityProof && !selectedVer.profile?.companyDocument && (
                        <p className="text-sm text-muted-foreground italic">No documents uploaded yet.</p>
                      )}

                      {/* Reject mode */}
                      {rejectMode && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Rejection Reason *</p>
                          <textarea
                            className="w-full border border-border rounded-xl p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                            rows={3}
                            placeholder="Explain why this startup is being rejected..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pt-2 flex-wrap">
                        {selectedVer.verificationStatus === "pending" && !rejectMode && (
                          <>
                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(selectedVer)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                            </Button>
                            <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleMoreInfo(selectedVer)}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Need Info
                            </Button>
                            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setRejectMode(true)}>
                              <XCircle className="h-4 w-4 mr-2" /> Reject
                            </Button>
                          </>
                        )}
                        {rejectMode && (
                          <>
                            <Button variant="outline" className="flex-1" onClick={() => setRejectMode(false)}>Back</Button>
                            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleReject(selectedVer)}>
                              Confirm Rejection
                            </Button>
                          </>
                        )}
                        {selectedVer.verificationStatus !== "pending" && (
                          <Button variant="outline" className="w-full" onClick={() => setSelectedVer(null)}>Close</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────── USER MANAGEMENT ──────────────── */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                  <p className="text-muted-foreground mt-1">{users.length} users loaded</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 w-56" placeholder="Search name or email..." value={search}
                      onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && loadTab("users")} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => loadTab("users")}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {tabLoading ? <LoadingSpinner /> : users.length === 0 ? (
                <EmptyState icon={Users} text="No users found." />
              ) : (
                <div className="space-y-2">
                  {users.map(u => (
                    <Card key={(u as any)._id ?? u.id} className="border border-border">
                      <CardContent className="flex items-center justify-between p-4 flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} avatar={u.avatar} size="sm" />
                          <div>
                            <p className="font-semibold text-foreground text-sm">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {u.role && <Badge variant="secondary" className="capitalize">{u.role}</Badge>}
                          {(u as any).onboarded && <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">Onboarded</Badge>}
                          {(u as any).verificationStatus === "approved" && <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">Verified</Badge>}
                          {(u as any).suspended && <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">Suspended</Badge>}
                          <Button size="sm" variant="outline"
                            className={`h-8 text-xs ${(u as any).suspended ? "text-emerald-600 border-emerald-200" : "text-amber-600 border-amber-200"}`}
                            onClick={() => handleSuspend(u)}>
                            {(u as any).suspended ? <RotateCcw className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                            {(u as any).suspended ? "Reinstate" : "Suspend"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUser((u as any)._id ?? u.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── PROBLEM POSTS ──────────────── */}
          {activeTab === "problems" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Problem Posts</h1>
                  <p className="text-muted-foreground mt-1">Moderate all posted problems.</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 w-56" placeholder="Search problems..." value={search}
                      onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && loadTab("problems")} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => loadTab("problems")}><Search className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[["", "All"], ["open", "Open"], ["in_progress", "In Progress"], ["closed", "Closed"]].map(([val, label]) => (
                  <button key={val} onClick={() => { setProblemFilter(val); loadTab("problems"); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      problemFilter === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}>{label}</button>
                ))}
              </div>

              {tabLoading ? <LoadingSpinner /> : problems.length === 0 ? (
                <EmptyState icon={FileText} text="No problems found." />
              ) : (
                <div className="space-y-2">
                  {problems.map(p => (
                    <Card key={p._id} className="border border-border">
                      <CardContent className="flex items-start justify-between p-5 flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{p.title}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                          <div className="flex gap-2 mt-2 flex-wrap items-center">
                            {p.tags?.slice(0, 3).map(t => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>)}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {p.status}
                            </span>
                            {(p.startupUserId as any)?.fullName && (
                              <span className="text-xs text-muted-foreground">by {(p.startupUserId as any).fullName}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(p.createdAt ?? "").toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProblem(p._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── APPLICATIONS ──────────────── */}
          {activeTab === "applications" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Applications & Pitches</h1>
                <p className="text-muted-foreground mt-1">Monitor all collaboration applications.</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[["", "All"], ["pending", "Pending"], ["accepted", "Accepted"], ["finalised", "Finalised"], ["better_luck", "Declined"]].map(([val, label]) => (
                  <button key={val} onClick={() => { setAppFilter(val); loadTab("applications"); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      appFilter === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}>{label}</button>
                ))}
              </div>

              {tabLoading ? <LoadingSpinner /> : applications.length === 0 ? (
                <EmptyState icon={Handshake} text="No applications found." />
              ) : (
                <div className="space-y-2">
                  {applications.map(a => (
                    <Card key={a._id} className="border border-border">
                      <CardContent className="p-5 flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{a.problemTitle}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            <span className="font-medium">{(a.freelancerUserId as any)?.fullName ?? "Freelancer"}</span>
                            {" → "}
                            <span className="font-medium">{(a.startupUserId as any)?.fullName ?? "Startup"}</span>
                          </p>
                          <div className="flex gap-2 mt-2 items-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              a.status === "finalised" || a.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                              a.status === "better_luck" ? "bg-red-100 text-red-700" :
                              "bg-muted text-muted-foreground"
                            }`}>{a.status}</span>
                            <span className="text-xs text-muted-foreground">{new Date((a as any).createdAt ?? "").toLocaleDateString()}</span>
                          </div>
                        </div>
                        {a.skills?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {a.skills.slice(0, 3).map(s => <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded-full">{s}</span>)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── REPORTS ──────────────── */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Reports & Disputes</h1>
                <p className="text-muted-foreground mt-1">Review and resolve user-filed reports.</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[["open", "Open"], ["resolved", "Resolved"], ["dismissed", "Dismissed"], ["", "All"]].map(([val, label]) => (
                  <button key={val} onClick={() => setReportFilter(val)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      reportFilter === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}>{label}</button>
                ))}
              </div>

              {tabLoading ? <LoadingSpinner /> : reports.length === 0 ? (
                <EmptyState icon={Flag} text="No reports in this category." />
              ) : (
                <div className="space-y-4">
                  {reports.map(r => (
                    <Card key={r._id} className={`border ${r.status === "open" ? "border-red-200 bg-red-50/20" : "border-border opacity-70"}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                r.status === "open" ? "bg-red-100 text-red-700" :
                                r.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                                "bg-muted text-muted-foreground"
                              }`}>{r.status}</span>
                            </div>
                            <p className="mt-1 font-semibold text-foreground text-sm">
                              {r.reporterUserId?.fullName ?? "Unknown"}{" "}
                              <span className="font-normal text-muted-foreground">reported</span>{" "}
                              <span className="text-primary">{r.reportedUserId?.fullName ?? "Unknown"}</span>
                              <span className="text-xs text-muted-foreground ml-1">({r.reportedUserId?.role})</span>
                            </p>
                            <p className="text-sm font-medium text-foreground mt-1 capitalize">{r.reason.replace(/_/g, " ")}</p>
                            {r.description && <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>}
                            <p className="text-xs text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                          </div>
                          {r.status === "open" && (
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleReport(r._id, "resolved")}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleReport(r._id, "dismissed")}>
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── COLLAB REQUESTS ──────────────── */}
          {activeTab === "collab" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Collab Requests</h1>
                <p className="text-muted-foreground mt-1">View and moderate all collaboration requests.</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[["", "All"], ["open", "Open"], ["closed", "Closed"]].map(([val, label]) => (
                  <button key={val} onClick={() => { setCollabFilter(val); loadTab("collab"); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      collabFilter === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}>{label}</button>
                ))}
              </div>

              {tabLoading ? <LoadingSpinner /> : collabs.length === 0 ? (
                <EmptyState icon={MessageSquare} text="No collab requests found." />
              ) : (
                <div className="space-y-2">
                  {collabs.map(c => (
                    <Card key={c._id} className="border border-border">
                      <CardContent className="flex items-start justify-between p-5 flex-wrap gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{c.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                          <div className="flex gap-2 mt-2 flex-wrap items-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {c.status}
                            </span>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Looking for: {c.lookingFor}</span>
                            {(c.userId as any)?.fullName && <span className="text-xs text-muted-foreground">by {(c.userId as any).fullName}</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCollab(c._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── ANALYTICS ──────────────── */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
                <p className="text-muted-foreground mt-1">Platform growth metrics from the last 30 days.</p>
              </div>

              {tabLoading ? <LoadingSpinner /> : (
                <>
                  {/* Summary cards from stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: "Verification Pass Rate", value: stats && stats.startups > 0
                        ? `${Math.round(((analytics?.verStats?.find(v => v._id === "approved")?.count ?? 0) / stats.startups) * 100)}%` : "—",
                        color: "text-emerald-600" },
                      { label: "Open Problem Rate", value: stats && stats.totalProblems > 0
                        ? `${Math.round((stats.openProblems / stats.totalProblems) * 100)}%` : "—",
                        color: "text-blue-600" },
                      { label: "Collab Success Rate", value: stats && stats.totalApplications > 0
                        ? `${Math.round((stats.acceptedApplications / stats.totalApplications) * 100)}%` : "—",
                        color: "text-violet-600" },
                      { label: "Open Reports",    value: String(stats?.openReports ?? 0),  color: "text-red-600" },
                      { label: "Suspended Users", value: String(stats?.suspended ?? 0),     color: "text-amber-600" },
                      { label: "Total Ratings",   value: String(stats?.ratings ?? 0),       color: "text-teal-600" },
                    ].map(m => (
                      <Card key={m.label} className="border border-border">
                        <CardContent className="p-5">
                          <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                          <p className="text-sm font-semibold text-foreground mt-1">{m.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Verification breakdown */}
                  {analytics?.verStats && (
                    <Card className="border border-border">
                      <CardHeader className="pb-2"><CardTitle className="text-base">Startup Verification Breakdown</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {analytics.verStats.map(v => (
                          <div key={v._id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize text-muted-foreground">{v._id?.replace("_", " ") ?? "unknown"}</span>
                              <span className="font-semibold text-foreground">{v.count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${
                                v._id === "approved" ? "bg-emerald-500" :
                                v._id === "pending"  ? "bg-amber-500"  :
                                v._id === "rejected" ? "bg-red-500"    : "bg-muted-foreground/30"
                              }`} style={{ width: `${stats?.startups ? Math.round((v.count / stats.startups) * 100) : 0}%` }} />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Signup trend */}
                  {analytics?.signupsByDay && analytics.signupsByDay.length > 0 && (
                    <Card className="border border-border">
                      <CardHeader className="pb-2"><CardTitle className="text-base">Signups (Last 30 Days)</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-1 h-24">
                          {analytics.signupsByDay.map(d => {
                            const max = Math.max(...analytics.signupsByDay.map(x => x.count));
                            return (
                              <div key={d._id} className="flex-1 flex flex-col items-center gap-1" title={`${d._id}: ${d.count}`}>
                                <div className="w-full rounded-sm bg-primary/70" style={{ height: `${max ? (d.count / max) * 80 : 0}px` }} />
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {analytics.signupsByDay.reduce((a, b) => a + b.count, 0)} total signups in last 30 days
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* ──────────────── ANNOUNCEMENTS ──────────────── */}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
                <p className="text-muted-foreground mt-1">Send platform-wide messages to users.</p>
              </div>

              <Card className="border border-border">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Send To</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["all", "startup", "freelancer"] as const).map(t => (
                        <button key={t} onClick={() => setAnnTarget(t)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${
                            annTarget === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                          }`}>
                          {t === "all" ? "All Users" : `${t}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Message</p>
                    <textarea
                      className="w-full border border-border rounded-xl p-4 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={4} placeholder="Write your announcement here..."
                      value={annMsg} onChange={e => setAnnMsg(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSendAnnouncement} disabled={!annMsg.trim()}>
                    <Megaphone className="h-4 w-4 mr-2" /> Send Announcement
                  </Button>
                </CardContent>
              </Card>

              {tabLoading ? <LoadingSpinner /> : (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Announcements</p>
                  {announcements.length === 0 ? (
                    <EmptyState icon={Bell} text="No announcements sent yet." />
                  ) : (
                    <div className="space-y-3">
                      {announcements.map(a => (
                        <div key={a._id} className="flex items-start gap-4 rounded-xl border border-border p-4">
                          <Bell className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{a.message}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">
                                {a.target === "all" ? "All users" : `${a.target}s`}
                              </span>
                              <span className="text-xs text-muted-foreground">by {a.sentBy?.fullName}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── SETTINGS ──────────────── */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
                <p className="text-muted-foreground mt-1">Control platform-wide features.</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Maintenance Mode", desc: "Temporarily disable the platform for all users.", value: maintenanceMode, setter: setMaintenanceMode, danger: true },
                  { label: "Allow New Signups", desc: "When disabled, new users cannot create accounts.", value: allowSignups, setter: setAllowSignups, danger: false },
                ].map(s => (
                  <Card key={s.label} className={`border ${s.danger && s.value ? "border-red-200 bg-red-50/20" : "border-border"}`}>
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <p className="font-semibold text-foreground">{s.label}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
                      </div>
                      <button onClick={() => { s.setter(!s.value); toast({ title: `${s.label}: ${!s.value ? "ON" : "OFF"}` }); }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.value ? (s.danger ? "bg-red-500" : "bg-primary") : "bg-muted"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${s.value ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </CardContent>
                  </Card>
                ))}

                <Card className="border border-border">
                  <CardContent className="p-5">
                    <p className="font-semibold text-foreground">Admin Emails</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set in your backend <code className="bg-muted px-1 py-0.5 rounded text-xs">ADMIN_EMAILS</code> environment variable. Comma-separated list of admin email addresses.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Current admin: <span className="font-medium text-foreground">{user?.email}</span></p>
                  </CardContent>
                </Card>

                <Card className="border border-red-200 bg-red-50/20">
                  <CardContent className="p-5">
                    <p className="font-semibold text-red-700">Danger Zone</p>
                    <p className="text-sm text-muted-foreground mt-1">Irreversible actions. Proceed with extreme caution.</p>
                    <div className="flex gap-3 mt-3 flex-wrap">
                      <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
                        <Download className="h-4 w-4 mr-2" /> Export All Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
