import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { adminApi, AnalyticsData, AdminStats } from "../lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Spinner, SectionHeader, ACard } from "../components/AdminUI";

interface Props { stats: AdminStats | null }

const Analytics = ({ stats }: Props) => {
  const { toast } = useToast();
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAnalytics()
      .then(setData)
      .catch(() => toast({ title: "Failed to load analytics", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const maxSignups = Math.max(1, ...(data?.signupsByDay ?? []).map(d => d.count));

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics" sub="Platform metrics — last 30 days from database." />

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: "Verification pass rate",
            value: stats && stats.startups > 0
              ? `${Math.round(((data?.verStats?.find(v => v._id === "approved")?.count ?? 0) / stats.startups) * 100)}%`
              : "—",
            color: "text-emerald-400",
          },
          {
            label: "Collab success rate",
            value: stats && stats.totalApplications > 0
              ? `${Math.round((stats.acceptedApplications / stats.totalApplications) * 100)}%`
              : "—",
            color: "text-blue-400",
          },
          {
            label: "Open problem rate",
            value: stats && stats.totalProblems > 0
              ? `${Math.round((stats.openProblems / stats.totalProblems) * 100)}%`
              : "—",
            color: "text-amber-400",
          },
          { label: "Open reports",     value: String(stats?.openReports ?? 0),  color: "text-red-400" },
          { label: "Suspended users",  value: String(stats?.suspended ?? 0),     color: "text-orange-400" },
          { label: "Total milestones", value: String(stats?.milestones ?? 0),    color: "text-violet-400" },
        ].map(m => (
          <ACard key={m.label} className="p-5">
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-blue-400 mt-1">{m.label}</p>
          </ACard>
        ))}
      </div>

      {/* Signups bar chart */}
      {data?.signupsByDay && data.signupsByDay.length > 0 && (
        <ACard className="p-5">
          <p className="text-sm font-semibold text-white mb-4">New signups — last 30 days</p>
          <div className="flex items-end gap-1 h-28">
            {data.signupsByDay.map(d => (
              <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group relative"
                title={`${d._id}: ${d.count}`}>
                <div
                  className="w-full rounded-sm bg-blue-600/70 hover:bg-blue-500 transition-colors"
                  style={{ height: `${(d.count / maxSignups) * 100}px` }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-500 mt-3">
            Total: {data.signupsByDay.reduce((a, b) => a + b.count, 0)} signups
          </p>
        </ACard>
      )}

      {/* Verification breakdown */}
      {data?.verStats && data.verStats.length > 0 && (
        <ACard className="p-5">
          <p className="text-sm font-semibold text-white mb-4">Startup verification breakdown</p>
          <div className="space-y-3">
            {data.verStats.map(v => {
              const colors: Record<string, string> = {
                approved:     "bg-emerald-500",
                pending:      "bg-amber-500",
                rejected:     "bg-red-500",
                more_info:    "bg-blue-500",
                not_required: "bg-blue-900",
              };
              const total = data.verStats.reduce((a, b) => a + b.count, 0);
              return (
                <div key={v._id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-400 capitalize">{(v._id ?? "unknown").replace("_", " ")}</span>
                    <span className="text-white font-semibold">{v.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-blue-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[v._id] ?? "bg-blue-600"}`}
                      style={{ width: `${total > 0 ? Math.round((v.count / total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ACard>
      )}

      {/* User breakdown */}
      {stats && (
        <ACard className="p-5">
          <p className="text-sm font-semibold text-white mb-4">User role distribution</p>
          <div className="space-y-3">
            {[
              { label: "Startups",    value: stats.startups,    color: "bg-violet-500" },
              { label: "Freelancers", value: stats.freelancers, color: "bg-emerald-500" },
            ].map(b => (
              <div key={b.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">{b.label}</span>
                  <span className="text-white font-semibold">{b.value}</span>
                </div>
                <div className="h-2 rounded-full bg-blue-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${b.color}`}
                    style={{ width: `${stats.totalUsers > 0 ? Math.round((b.value / stats.totalUsers) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ACard>
      )}
    </div>
  );
};

export default Analytics;
