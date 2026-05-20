import { useState, useEffect } from "react";
import { Trash2, FileText, Handshake, MessageSquare, Flag, Star, CheckCircle2 } from "lucide-react";
import {
  adminApi, AdminProblem, AdminApplication, AdminCollabRequest, AdminReport, AdminRating,
} from "../lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import {
  Spinner, Empty, Avatar, StatusPill, SectionHeader, Btn, SearchInput, ACard, FilterPills,
} from "../components/AdminUI";

// ─── Problems ─────────────────────────────────────────────────────────────────
export const Problems = () => {
  const { toast } = useToast();
  const [items,   setItems]   = useState<AdminProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [status,  setStatus]  = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { problems } = await adminApi.getProblems({ status: status || undefined, search: search || undefined });
      setItems(problems);
    } catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const del = async (id: string) => {
    if (!confirm("Delete this problem?")) return;
    try { await adminApi.deleteProblem(id); setItems(p => p.filter(x => x._id !== id)); toast({ title: "Deleted" }); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div>
      <SectionHeader title="Problem Posts" sub="Moderate all posted problems and tasks.">
        <div className="flex gap-2">
          <SearchInput value={search} onChange={setSearch} onSearch={load} placeholder="Search problems..." />
          <Btn variant="primary" onClick={load}>Search</Btn>
        </div>
      </SectionHeader>
      {/* <FilterPills value={status} onChange={setStatus}
        options={[{label:"All",value:""},{label:"Open",value:"open"},{label:"In Progress",value:"in_progress"},{label:"Closed",value:"closed"}]} /> */}
      <div className="mt-5 space-y-2">
        {loading ? <Spinner /> : items.length === 0 ? <Empty icon={FileText} text="No problems found." /> : items.map(p => (
          <ACard key={p._id} className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-white text-sm">{p.title}</p>
                <StatusPill status={p.status} />
              </div>
              <p className="text-xs text-blue-400 mt-1 line-clamp-2">{p.description}</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                {p.tags?.slice(0,3).map(t => <span key={t} className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">{t}</span>)}
                {typeof p.startupUserId === "object" && (
                  <span className="text-[10px] text-blue-500">by {p.startupUserId.fullName}</span>
                )}
                <span className="text-[10px] text-blue-600">{p.applicationCount} applicants</span>
              </div>
              <p className="text-[10px] text-blue-700 mt-1">{new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <Btn variant="danger" onClick={() => del(p._id)}><Trash2 className="h-3.5 w-3.5" /></Btn>
          </ACard>
        ))}
      </div>
    </div>
  );
};

// ─── Applications ─────────────────────────────────────────────────────────────
export const Applications = () => {
  const { toast } = useToast();
  const [items,   setItems]   = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState("");

  const load = async () => {
    setLoading(true);
    try { const { applications } = await adminApi.getApplications({ status: status || undefined }); setItems(applications); }
    catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  return (
    <div>
      <SectionHeader title="Applications & Pitches" sub="Monitor all collaboration applications platform-wide." />
      <FilterPills value={status} onChange={setStatus}
        options={[{label:"All",value:""},{label:"Pending",value:"pending"},{label:"Accepted",value:"accepted"},{label:"Finalised",value:"finalised"},{label:"Declined",value:"better_luck"}]} />
      <div className="mt-5 space-y-2">
        {loading ? <Spinner /> : items.length === 0 ? <Empty icon={Handshake} text="No applications found." /> : items.map(a => (
          <ACard key={a._id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-white text-sm">{a.problemTitle}</p>
                <p className="text-xs text-blue-400 mt-0.5">
                  <span className="text-blue-200">{typeof a.freelancerUserId === "object" ? a.freelancerUserId.fullName : "Freelancer"}</span>
                  {" → "}
                  <span className="text-blue-200">{typeof a.startupUserId === "object" ? a.startupUserId.fullName : "Startup"}</span>
                </p>
                <div className="flex gap-2 mt-1.5 items-center flex-wrap">
                  <StatusPill status={a.status} />
                  {a.skills?.slice(0,3).map(s => <span key={s} className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">{s}</span>)}
                </div>
              </div>
              <span className="text-[10px] text-blue-600">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          </ACard>
        ))}
      </div>
    </div>
  );
};

// ─── Collab Requests ──────────────────────────────────────────────────────────
export const CollabRequests = () => {
  const { toast } = useToast();
  const [items,   setItems]   = useState<AdminCollabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState("");

  const load = async () => {
    setLoading(true);
    try { const { collabRequests } = await adminApi.getCollabRequests({ status: status || undefined }); setItems(collabRequests); }
    catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const del = async (id: string) => {
    if (!confirm("Delete this collab request?")) return;
    try { await adminApi.deleteCollabRequest(id); setItems(p => p.filter(x => x._id !== id)); toast({ title: "Deleted" }); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div>
      <SectionHeader title="Collab Requests" sub="View and moderate all collaboration requests." />
      <FilterPills value={status} onChange={setStatus}
        options={[{label:"All",value:""},{label:"Open",value:"open"},{label:"Closed",value:"closed"}]} />
      <div className="mt-5 space-y-2">
        {loading ? <Spinner /> : items.length === 0 ? <Empty icon={MessageSquare} text="No collab requests found." /> : items.map(c => (
          <ACard key={c._id} className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-white text-sm">{c.title}</p>
                <StatusPill status={c.status} />
              </div>
              <p className="text-xs text-blue-400 mt-1 line-clamp-2">{c.description}</p>
              <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">Looking for: {c.lookingFor}</span>
                {typeof c.userId === "object" && <span className="text-[10px] text-blue-500">by {c.userId.fullName}</span>}
              </div>
            </div>
            <Btn variant="danger" onClick={() => del(c._id)}><Trash2 className="h-3.5 w-3.5" /></Btn>
          </ACard>
        ))}
      </div>
    </div>
  );
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const Reports = () => {
  const { toast } = useToast();
  const [items,   setItems]   = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState("open");

  const load = async () => {
    setLoading(true);
    try { const { reports } = await adminApi.getReports({ status: status || undefined }); setItems(reports); }
    catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const handle = async (id: string, st: "resolved" | "dismissed") => {
    try {
      const { report } = await adminApi.updateReport(id, st);
      setItems(prev => prev.map(r => r._id === id ? report : r));
      toast({ title: st === "resolved" ? "Report resolved" : "Report dismissed" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div>
      <SectionHeader title="Reports & Disputes" sub="Review and resolve user-filed reports." />
      <FilterPills value={status} onChange={setStatus}
        options={[{label:"Open",value:"open"},{label:"Resolved",value:"resolved"},{label:"Dismissed",value:"dismissed"},{label:"All",value:""}]} />
      <div className="mt-5 space-y-3">
        {loading ? <Spinner /> : items.length === 0 ? <Empty icon={Flag} text="No reports in this category." /> : items.map(r => (
          <ACard key={r._id} className={`p-5 ${r.status === "open" ? "border-red-800/60 bg-red-950/10" : "opacity-70"}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex gap-2 items-center mb-1">
                  <StatusPill status={r.status} />
                  <span className="text-[10px] text-blue-600">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  {r.reporterUserId?.fullName ?? "Unknown"}{" "}
                  <span className="font-normal text-blue-400">reported</span>{" "}
                  <span className="text-blue-200">{r.reportedUserId?.fullName ?? "Unknown"}</span>
                  <span className="text-[10px] text-blue-500 ml-1">({r.reportedUserId?.role})</span>
                </p>
                <p className="text-xs font-medium text-blue-300 mt-0.5 capitalize">{r.reason.replace(/_/g, " ")}</p>
                {r.description && <p className="text-xs text-blue-500 mt-0.5">{r.description}</p>}
              </div>
              {r.status === "open" && (
                <div className="flex gap-2">
                  <Btn variant="success" onClick={() => handle(r._id, "resolved")}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                  </Btn>
                  <Btn variant="outline" onClick={() => handle(r._id, "dismissed")}>Dismiss</Btn>
                </div>
              )}
            </div>
          </ACard>
        ))}
      </div>
    </div>
  );
};

// ─── Ratings ──────────────────────────────────────────────────────────────────
export const Ratings = () => {
  const { toast } = useToast();
  const [items,   setItems]   = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getRatings()
      .then(({ ratings }) => setItems(ratings))
      .catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <SectionHeader title="Ratings" sub="All peer ratings submitted on the platform." />
      <div className="space-y-2">
        {loading ? <Spinner /> : items.length === 0 ? <Empty icon={Star} text="No ratings yet." /> : items.map(r => {
          const reviewer = typeof r.reviewerId === "object" ? r.reviewerId : null;
          const reviewee = typeof r.revieweeId === "object" ? r.revieweeId : null;
          return (
            <ACard key={r._id} className="px-5 py-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar name={reviewer?.fullName} avatar={reviewer?.avatar} size="sm" />
                <div>
                  <p className="text-sm text-white">
                    <span className="font-semibold">{reviewer?.fullName ?? "?"}</span>
                    <span className="text-blue-400"> rated </span>
                    <span className="font-semibold">{reviewee?.fullName ?? "?"}</span>
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-blue-800"}`} />
                    ))}
                    {r.comment && <span className="text-xs text-blue-400 ml-2 italic">"{r.comment}"</span>}
                  </div>
                </div>
                <span className="ml-auto text-[10px] text-blue-600">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            </ACard>
          );
        })}
      </div>
    </div>
  );
};
