import { ShieldOff, AlertTriangle, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  reason?: string;
  isOwn?: boolean;       // true = showing to the suspended user themselves
}

/**
 * Full-width top banner — shown inside dashboard/profile pages.
 * Replaces the whole page only when isOwn=false (visitor seeing suspended profile).
 */
export const SuspendedTopBanner = ({ reason, isOwn = true }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-red-600 text-white">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-start gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 shrink-0 mt-0.5">
          <ShieldOff className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] leading-tight">
            {isOwn ? "Your account is suspended" : "This account has been suspended"}
          </p>
          {reason && (
            <p className="text-red-100 text-sm mt-1 leading-relaxed">
              <span className="font-semibold">Reason:</span> {reason}
            </p>
          )}
          {isOwn && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <button
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Documents
              </button>
              <a
                href="mailto:support@cohustle.com"
                className="text-xs text-red-200 hover:text-white underline transition-colors"
              >
                Contact support to appeal →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline banner — used inside cards, drawers, dialogs.
 */
export const SuspendedInlineBanner = ({ reason }: Props) => (
  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
    <ShieldOff className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-semibold text-red-800">Account suspended</p>
      {reason && <p className="text-sm text-red-700 mt-0.5">Reason: {reason}</p>}
      <p className="text-xs text-red-600 mt-1">
        You cannot apply, pitch, or message anyone while suspended.
      </p>
    </div>
  </div>
);

/**
 * Full-page block — used when a visitor lands on a suspended user's profile.
 */
const SuspendedBanner = ({ reason }: Props) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="max-w-md w-full text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 border border-red-200 mx-auto mb-6">
        <ShieldOff className="h-8 w-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Account Suspended</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        This CoHustle account has been suspended by an administrator.
      </p>
      {reason && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-left">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Reason</p>
            <p className="text-sm text-red-700 mt-0.5">{reason}</p>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default SuspendedBanner;
