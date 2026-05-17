import {
  LayoutDashboard, UserCheck, Users, FileText, Handshake,
  Flag, MessageSquare, TrendingUp, Megaphone, Settings, Activity
} from "lucide-react";

export type AdminTab =
  | "dashboard" | "verification" | "users" | "problems"
  | "applications" | "reports" | "collab" | "analytics"
  | "announcements" | "settings";

interface SidebarProps {
  active: AdminTab;
  onChange: (tab: AdminTab) => void;
  badges?: { verification?: number; reports?: number };
}

const nav: { id: AdminTab; label: string; icon: any; group?: string }[] = [
  { id: "dashboard",     label: "Dashboard",          icon: LayoutDashboard, group: "Overview" },
  { id: "verification",  label: "Verification Queue", icon: UserCheck,       group: "Moderation" },
  { id: "users",         label: "Users",              icon: Users,           group: "Moderation" },
  { id: "problems",      label: "Problem Posts",      icon: FileText,        group: "Moderation" },
  { id: "applications",  label: "Applications",       icon: Handshake,       group: "Moderation" },
  { id: "reports",       label: "Reports",            icon: Flag,            group: "Moderation" },
  { id: "collab",        label: "Collab Requests",    icon: MessageSquare,   group: "Moderation" },
  { id: "analytics",     label: "Analytics",          icon: TrendingUp,      group: "Insights" },
  { id: "announcements", label: "Announcements",      icon: Megaphone,       group: "Insights" },
  { id: "settings",      label: "Settings",           icon: Settings,        group: "Config" },
];

const AdminSidebar = ({ active, onChange, badges = {} }: SidebarProps) => {
  const groups = [...new Set(nav.map(n => n.group))];

  return (
    <aside className="hidden md:flex w-56 min-h-[calc(100vh-56px)] flex-col bg-blue-950 border-r border-blue-900 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
      <div className="flex-1 px-3 py-4 space-y-6">
        {groups.map(group => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600">
              {group}
            </p>
            <div className="space-y-0.5">
              {nav.filter(n => n.group === group).map(item => {
                const Icon = item.icon;
                const isActive = active === item.id;
                const badge = item.id === "verification" ? badges.verification
                            : item.id === "reports"      ? badges.reports
                            : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                        : "text-blue-300 hover:text-white hover:bg-blue-900/60"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-blue-400"}`} />
                      {item.label}
                    </span>
                    {!!badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                        isActive ? "bg-white/20 text-white" : "bg-red-500/90 text-white"
                      }`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* System status footer */}
      <div className="px-4 py-3 border-t border-blue-900">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </div>
          <span className="text-xs text-blue-500">All systems operational</span>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
