import { useState, useEffect } from "react";
import { Bell, Megaphone, Settings as SettingsIcon, Download } from "lucide-react";
import { adminApi, AdminAnnouncement } from "../lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Spinner, Empty, SectionHeader, Btn, ACard } from "../components/AdminUI";
import { useAdminAuth } from "../context/AdminAuthContext";

// ─── Announcements ────────────────────────────────────────────────────────────
export const Announcements = () => {
  const { toast } = useToast();
  const [items,   setItems]   = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState("");
  const [target,  setTarget]  = useState<"all" | "startup" | "freelancer">("all");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminApi.getAnnouncements()
      .then(({ announcements }) => setItems(announcements))
      .catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      const { announcement } = await adminApi.sendAnnouncement(msg.trim(), target);
      setItems(prev => [announcement, ...prev]);
      setMsg("");
      toast({ title: "📢 Announcement sent successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Announcements" sub="Send platform-wide messages to users. Saved to database." />

      <ACard className="p-6 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Send To</p>
          <div className="flex gap-2 flex-wrap">
            {(["all", "startup", "freelancer"] as const).map(t => (
              <button key={t} onClick={() => setTarget(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                  target === t
                    ? "bg-blue-600 text-white border-blue-500"
                    : "border-blue-800 text-blue-400 hover:border-blue-600 hover:text-white bg-blue-950/40"
                }`}>
                {t === "all" ? "All Users" : `${t}s`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">Message</p>
          <textarea
            rows={4}
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Write your announcement..."
            className="w-full bg-blue-900/40 border border-blue-800 rounded-xl p-4 text-sm text-blue-100 placeholder:text-blue-600 resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        <Btn variant="primary" size="md" disabled={!msg.trim() || sending} onClick={send} className="w-full justify-center">
          <Megaphone className="h-4 w-4" />
          {sending ? "Sending..." : "Send Announcement"}
        </Btn>
      </ACard>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Recent Announcements</p>
        {loading ? <Spinner /> : items.length === 0 ? (
          <Empty icon={Bell} text="No announcements sent yet." />
        ) : (
          <div className="space-y-3">
            {items.map(a => (
              <ACard key={a._id} className="px-5 py-4 flex items-start gap-4">
                <Bell className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-100">{a.message}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-blue-600">{new Date(a.createdAt).toLocaleString()}</span>
                    <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800 capitalize">
                      {a.target === "all" ? "All users" : `${a.target}s`}
                    </span>
                    <span className="text-[10px] text-blue-600">by {a.sentBy?.fullName}</span>
                  </div>
                </div>
              </ACard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const AdminSettings = () => {
  const { toast } = useToast();
  const { user }  = useAdminAuth();
  const [maint,    setMaint]    = useState(false);
  const [signups,  setSignups]  = useState(true);

  const toggle = (key: string, val: boolean) => {
    toast({ title: `${key}: ${val ? "ON" : "OFF"}` });
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Platform Settings" sub="Control platform-wide features and configuration." />

      <div className="space-y-3">
        {[
          { label: "Maintenance Mode", desc: "Temporarily disable the platform for all users.", val: maint, set: setMaint, danger: true },
          { label: "Allow New Signups", desc: "When disabled, new users cannot create accounts.", val: signups, set: setSignups, danger: false },
        ].map(s => (
          <ACard key={s.label} className={`px-5 py-4 flex items-center justify-between ${s.danger && s.val ? "border-red-800/60 bg-red-950/20" : ""}`}>
            <div>
              <p className="text-sm font-semibold text-white">{s.label}</p>
              <p className="text-xs text-blue-400 mt-0.5">{s.desc}</p>
            </div>
            <button
              onClick={() => { s.set(!s.val); toggle(s.label, !s.val); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                s.val ? (s.danger ? "bg-red-600" : "bg-blue-600") : "bg-blue-900"
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${s.val ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </ACard>
        ))}

        <ACard className="px-5 py-4">
          <p className="text-sm font-semibold text-white">Admin Access</p>
          <p className="text-xs text-blue-400 mt-1">
            Set in your backend <code className="bg-blue-900/60 px-1.5 py-0.5 rounded text-blue-300 text-[11px]">ADMIN_EMAILS</code> environment variable. Comma-separated list of email addresses.
          </p>
          <p className="text-xs text-blue-500 mt-2">Current admin: <span className="text-blue-200 font-medium">{user?.email}</span></p>
        </ACard>

        <ACard className="px-5 py-4 border-red-900/60 bg-red-950/10">
          <p className="text-sm font-semibold text-red-400">Danger Zone</p>
          <p className="text-xs text-blue-500 mt-1">Irreversible actions. Proceed with extreme caution.</p>
          <div className="flex gap-3 mt-3 flex-wrap">
            <Btn variant="danger" onClick={() => toast({ title: "Export not wired yet — add your endpoint" })}>
              <Download className="h-3.5 w-3.5" /> Export All Data
            </Btn>
          </div>
        </ACard>
      </div>
    </div>
  );
};
