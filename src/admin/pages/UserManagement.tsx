import { useState, useEffect } from "react";
import { Trash2, Ban, RotateCcw, Users } from "lucide-react";
import { adminApi, AdminUser } from "../lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Spinner, Empty, Avatar, VerBadge, StatusPill, SectionHeader, Btn, SearchInput, ACard, FilterPills } from "../components/AdminUI";

const UserManagement = () => {
  const { toast } = useToast();
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [role,    setRole]    = useState("");
  const [total,   setTotal]   = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { users: u, total: t } = await adminApi.getUsers({ search: search || undefined, role: role || undefined });
      setUsers(u); setTotal(t);
    } catch { toast({ title: "Failed to load users", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [role]);

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this user?")) return;
    try {
      await adminApi.deleteUser(id);
      setUsers(prev => prev.filter(u => u._id !== id));
      toast({ title: "User deleted" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleSuspend = async (u: AdminUser) => {
    try {
      await adminApi.suspendUser(u._id, !u.suspended);
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, suspended: !u.suspended } : x));
      toast({ title: u.suspended ? "User reinstated" : "User suspended" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div>
      <SectionHeader title="User Management" sub={`${total} total users on the platform`}>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} onSearch={load} placeholder="Search name or email..." />
          <Btn variant="primary" onClick={load}>Search</Btn>
        </div>
      </SectionHeader>

      <FilterPills
        value={role}
        onChange={setRole}
        options={[
          { label: "All",         value: "" },
          { label: "Startups",    value: "startup" },
          { label: "Freelancers", value: "freelancer" },
        ]}
      />

      <div className="mt-5 space-y-2">
        {loading ? <Spinner /> : users.length === 0 ? (
          <Empty icon={Users} text="No users found." />
        ) : users.map(u => (
          <ACard key={u._id} className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={u.fullName} avatar={u.avatar} size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{u.fullName}</p>
                <p className="text-xs text-blue-400">{u.email}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {u.role && (
                <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800 capitalize font-semibold">
                  {u.role}
                </span>
              )}
              {u.onboarded && (
                <span className="text-[10px] bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800 font-semibold">
                  Onboarded
                </span>
              )}
              {u.role === "startup" && u.verificationStatus !== "not_required" && (
                <VerBadge status={u.verificationStatus} />
              )}
              {u.suspended && (
                <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full border border-red-800 font-semibold">
                  Suspended
                </span>
              )}
              <Btn variant={u.suspended ? "outline" : "ghost"} onClick={() => handleSuspend(u)}>
                {u.suspended ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                {u.suspended ? "Reinstate" : "Suspend"}
              </Btn>
              <Btn variant="danger" onClick={() => handleDelete(u._id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>
          </ACard>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
