import {
  Users, FileText, Star, BarChart3, Handshake, Building2,
  UserCheck, Flag, MessageSquare, ShieldAlert, Ban, Activity, Clock,
} from "lucide-react";
import { AdminStats } from "../lib/adminApi";
import { StatCard, AlertBanner, ACard, Spinner } from "../components/AdminUI";
import { AdminTab } from "../components/AdminSidebar";

interface Props {
  stats: AdminStats | null;
  loading: boolean;
  goto: (tab: AdminTab) => void;
}

const Dashboard = ({ stats, loading, goto }: Props) => {
  if (loading) return <Spinner />;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-blue-400 mt-0.5">Live platform overview — all data fetched from database.</p>
      </div>

      {/* Alert banners */}
      <div className="space-y-3">
        {!!stats?.pendingVerifications && (
          <AlertBanner
            color="amber"
            text={`${stats.pendingVerifications} startup${stats.pendingVerifications > 1 ? "s" : ""} waiting for verification`}
            label="Review now"
            onClick={() => goto("verification")}
          />
        )}
        {!!stats?.openReports && (
          <AlertBanner
            color="red"
            text={`${stats.openReports} open dispute${stats.openReports > 1 ? "s" : ""} need attention`}
            label="View reports"
            onClick={() => goto("reports")}
          />
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"        value={stats?.totalUsers}           icon={Users}        color="text-blue-400"    bg="bg-blue-900/50" />
        <StatCard label="Startups"           value={stats?.startups}             icon={Building2}    color="text-violet-400"  bg="bg-violet-900/30" />
        <StatCard label="Freelancers"        value={stats?.freelancers}          icon={UserCheck}    color="text-emerald-400" bg="bg-emerald-900/30" />
        <StatCard label="Problems Posted"    value={stats?.totalProblems}        icon={FileText}     color="text-orange-400"  bg="bg-orange-900/30" />
        <StatCard label="Open Problems"      value={stats?.openProblems}         icon={Clock}        color="text-yellow-400"  bg="bg-yellow-900/30" />
        <StatCard label="Applications"       value={stats?.totalApplications}    icon={Handshake}    color="text-pink-400"    bg="bg-pink-900/30" />
        <StatCard label="Active Collabs"     value={stats?.acceptedApplications} icon={Activity}     color="text-teal-400"    bg="bg-teal-900/30" />
        <StatCard label="Collab Requests"    value={stats?.collabRequests}       icon={MessageSquare}color="text-indigo-400"  bg="bg-indigo-900/30" />
        <StatCard label="Milestones"         value={stats?.milestones}           icon={BarChart3}    color="text-cyan-400"    bg="bg-cyan-900/30" />
        <StatCard label="Ratings"            value={stats?.ratings}              icon={Star}         color="text-amber-400"   bg="bg-amber-900/30" />
        <StatCard label="Pending Verif."     value={stats?.pendingVerifications} icon={ShieldAlert}  color="text-amber-400"   bg="bg-amber-900/30" />
        <StatCard label="Suspended Users"    value={stats?.suspended}            icon={Ban}          color="text-red-400"     bg="bg-red-900/30" />
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-3">Quick actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Review Verifications", icon: UserCheck,    tab: "verification"  as AdminTab },
            { label: "Manage Reports",       icon: Flag,         tab: "reports"       as AdminTab },
            { label: "Send Announcement",    icon: MessageSquare,tab: "announcements" as AdminTab },
            { label: "User Management",      icon: Users,        tab: "users"         as AdminTab },
          ].map(a => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={() => goto(a.tab)}
                className="flex items-center gap-3 rounded-xl border border-blue-800 bg-blue-950/40 p-4 text-sm font-medium text-blue-300 hover:border-blue-600 hover:text-white hover:bg-blue-900/50 transition-all">
                <Icon className="h-4 w-4 text-blue-500 shrink-0" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
