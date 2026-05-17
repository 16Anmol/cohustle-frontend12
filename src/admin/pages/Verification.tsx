import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RefreshCw, Eye, ExternalLink } from "lucide-react";
import { adminApi, VerificationEntry } from "../lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import {
  Spinner, Empty, Avatar, VerBadge, FilterPills, SectionHeader, Btn, ACard,
} from "../components/AdminUI";
import { UserCheck } from "lucide-react";

const Verification = () => {
  const { toast } = useToast();
  const [items,      setItems]     = useState<VerificationEntry[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [filter,     setFilter]    = useState("pending");
  const [selected,   setSelected]  = useState<VerificationEntry | null>(null);
  const [rejectMode, setRejectMode]= useState(false);
  const [reason,     setReason]    = useState("");
  const [acting,     setActing]    = useState(false);

  const load = async (status: string) => {
    setLoading(true);
    try {
      const { verifications } = await adminApi.getVerifications({ status: status || undefined });
      setItems(verifications);
    } catch { toast({ title: "Failed to load", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(filter); }, [filter]);

  const act = async (fn: () => Promise<any>, msg: string) => {
    setActing(true);
    try {
      await fn();
      setItems(prev => prev.map(v => v._id === selected!._id
        ? { ...v, verificationStatus: msg === "approved" ? "approved" : msg === "rejected" ? "rejected" : "more_info" }
        : v
      ));
      setSelected(null); setRejectMode(false); setReason("");
      toast({ title: msg === "approved" ? "✅ Startup approved" : msg === "rejected" ? "❌ Startup rejected" : "ℹ️ Info requested" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setActing(false); }
  };

  return (
    <div>
      <SectionHeader
        title="Verification Queue"
        sub="Review startup documents and grant platform access."
      >
        <Btn variant="outline" onClick={() => load(filter)}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Btn>
      </SectionHeader>

      <FilterPills
        value={filter}
        onChange={setFilter}
        options={[
          { label: "Pending",   value: "pending"   },
          { label: "Approved",  value: "approved"  },
          { label: "Rejected",  value: "rejected"  },
          { label: "Need Info", value: "more_info" },
          { label: "All",       value: ""          },
        ]}
      />

      <div className="mt-5 space-y-3">
        {loading ? <Spinner /> : items.length === 0 ? (
          <Empty icon={UserCheck} text="No startups in this category." />
        ) : items.map(v => (
          <ACard key={v._id} className={`p-5 ${v.verificationStatus === "pending" ? "border-amber-800/60 bg-amber-950/20" : ""}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <Avatar name={v.fullName} avatar={v.avatar} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-sm">{v.profile?.startupName ?? v.fullName}</p>
                    <VerBadge status={v.verificationStatus} />
                  </div>
                  <p className="text-xs text-blue-400 mt-0.5">{v.fullName} · {v.email}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {v.profile?.industry    && <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">{v.profile.industry}</span>}
                    {v.profile?.fundingStage && <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">{v.profile.fundingStage}</span>}
                    {v.profile?.location    && <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">{v.profile.location}</span>}
                  </div>
                  {v.verificationRejectionReason && (
                    <p className="text-xs text-red-400 mt-1 italic">Reason: {v.verificationRejectionReason}</p>
                  )}
                  <p className="text-[10px] text-blue-600 mt-1">Registered: {new Date(v.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Btn variant="outline" onClick={() => { setSelected(v); setRejectMode(false); setReason(""); }}>
                  <Eye className="h-3.5 w-3.5" /> View Docs
                </Btn>
                {v.verificationStatus === "pending" && (
                  <>
                    <Btn variant="success" onClick={() => { setSelected(v); act(() => adminApi.approve(v._id), "approved"); }}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Btn>
                    <Btn variant="outline" onClick={() => act(() => adminApi.moreInfo(v._id), "more_info")}>
                      <RefreshCw className="h-3.5 w-3.5" /> Need Info
                    </Btn>
                    <Btn variant="danger" onClick={() => { setSelected(v); setRejectMode(true); }}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Btn>
                  </>
                )}
              </div>
            </div>
          </ACard>
        ))}
      </div>

      {/* Document Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => { setSelected(null); setRejectMode(false); }}>
          <div className="bg-blue-950 border border-blue-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-blue-900">
              <div>
                <h2 className="text-base font-bold text-white">{selected.profile?.startupName ?? selected.fullName}</h2>
                <p className="text-xs text-blue-400 mt-0.5">{selected.fullName} · {selected.email}</p>
              </div>
              <VerBadge status={selected.verificationStatus} />
            </div>

            <div className="p-6 space-y-5">
              {/* Profile fields */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Industry",      selected.profile?.industry],
                  ["Funding Stage", selected.profile?.fundingStage],
                  ["Location",      selected.profile?.location],
                  ["Team Size",     selected.profile?.teamSize],
                  ["Website",       selected.profile?.website],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string}>
                    <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold">{k as string}</p>
                    <p className="text-sm text-blue-200 mt-0.5">{v as string}</p>
                  </div>
                ))}
              </div>
              {selected.profile?.description && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold mb-1">Description</p>
                  <p className="text-sm text-blue-200">{selected.profile.description}</p>
                </div>
              )}

              {/* Documents */}
              {[
                ["Identity Proof",   selected.profile?.identityProof],
                ["Company Document", selected.profile?.companyDocument],
                ["Pitch Deck",       selected.profile?.pitchDeck],
              ].filter(([, url]) => url).map(([label, url]) => (
                <div key={label as string}>
                  <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold mb-2">{label as string}</p>
                  <a href={url as string} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-blue-800 bg-blue-900/40 p-4 text-sm text-blue-300 hover:border-blue-600 hover:text-white transition-all">
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    Open document →
                  </a>
                </div>
              ))}
              {!selected.profile?.identityProof && !selected.profile?.companyDocument && (
                <p className="text-sm text-blue-500 italic">No documents uploaded yet.</p>
              )}

              {/* Reject reason */}
              {rejectMode && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold mb-2">Rejection Reason *</p>
                  <textarea
                    className="w-full border border-blue-800 rounded-xl p-3 text-sm bg-blue-900/40 text-blue-100 placeholder:text-blue-600 resize-none focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="Explain why this startup is being rejected..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                {selected.verificationStatus === "pending" && !rejectMode && (
                  <>
                    <Btn variant="success" size="md" disabled={acting} onClick={() => act(() => adminApi.approve(selected._id), "approved")}>
                      <CheckCircle2 className="h-4 w-4" /> Approve Startup
                    </Btn>
                    <Btn variant="outline" size="md" disabled={acting} onClick={() => act(() => adminApi.moreInfo(selected._id), "more_info")}>
                      <RefreshCw className="h-4 w-4" /> Request Info
                    </Btn>
                    <Btn variant="danger" size="md" onClick={() => setRejectMode(true)}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Btn>
                  </>
                )}
                {rejectMode && (
                  <>
                    <Btn variant="outline" size="md" onClick={() => setRejectMode(false)}>Back</Btn>
                    <Btn variant="danger" size="md" disabled={acting || !reason.trim()}
                      onClick={() => act(() => adminApi.reject(selected._id, reason), "rejected")}>
                      Confirm Rejection
                    </Btn>
                  </>
                )}
                {selected.verificationStatus !== "pending" && (
                  <Btn variant="outline" size="md" className="w-full justify-center" onClick={() => setSelected(null)}>Close</Btn>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Verification;
