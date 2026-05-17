import { useState } from "react";
import { Flag, X, ExternalLink, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { userActionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const REASONS = [
  { value: "fake_project",      label: "Fake or fraudulent project" },
  { value: "abusive_behavior",  label: "Abusive or offensive behavior" },
  { value: "spam",              label: "Spam or unsolicited content" },
  { value: "ghosting",          label: "Ghosted after accepting collab" },
  { value: "fraud",             label: "Scam or financial fraud" },
  { value: "other",             label: "Other" },
];

interface Props {
  reportedUser: { _id: string; fullName: string; role?: string; avatar?: string };
  onClose: () => void;
  onReported?: () => void;
}

const ReportModal = ({ reportedUser, onClose, onReported }: Props) => {
  const { toast } = useToast();
  const [reason,      setReason]      = useState("");
  const [description, setDescription] = useState("");
  const [screenshot,  setScreenshot]  = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await userActionsApi.report({
        reportedUserId: reportedUser._id,
        reason,
        description: description.trim(),
        screenshotUrl: screenshot.trim(),
      });
      setDone(true);
      toast({ title: "Report submitted", description: "Our team will review it shortly." });
      onReported?.();
    } catch (e: any) {
      toast({ title: "Failed to submit report", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div
        className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Flag size={15} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Report User</p>
              <p className="text-xs text-muted-foreground">{reportedUser.fullName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            /* Success state */
            <div className="text-center py-6">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <p className="font-bold text-foreground">Report submitted</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Our admin team will review your report. Thank you for keeping CoHustle safe.
              </p>
              <button onClick={onClose}
                className="mt-5 w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all">
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Reports are reviewed by admins. False reports may result in action against your account.
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {REASONS.map(r => (
                    <label key={r.value}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        reason === r.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40 text-foreground"
                      }`}>
                      <input
                        type="radio" name="reason" value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Description <span className="text-muted-foreground font-normal">(optional but helpful)</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what happened..."
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Screenshot */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Proof / Screenshot{" "}
                  <span className="text-muted-foreground font-normal">(optional — Google Drive link)</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={screenshot}
                    onChange={e => setScreenshot(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  {screenshot && (
                    <a href={screenshot} target="_blank" rel="noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Set sharing to "Anyone with the link can view" in Google Drive.
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-2.5 pt-1">
                <button onClick={onClose}
                  className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all">
                  Cancel
                </button>
                <button
                  disabled={!reason || submitting}
                  onClick={handleSubmit}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
                  {submitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
