import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileText } from "lucide-react";
import { profileApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  role: "startup" | "freelancer";
  existing: {
    identityProof?: string;
    companyDocument?: string;
    pitchDeck?: string;
    resumeLink?: string;
  };
  onSaved?: () => void;
}

const DocInput = ({
  label, hint, value, onChange, saved,
}: { label: string; hint: string; value: string; onChange: (v: string) => void; saved: boolean }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {saved && (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <CheckCircle2 size={11} /> Uploaded
        </span>
      )}
    </div>
    <input
      type="url"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={hint}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
    />
    <p className="text-xs text-gray-400 mt-1">Paste a Google Drive share link (set to "Anyone with link can view")</p>
  </div>
);

const DocumentUploadSection = ({ role, existing, onSaved }: Props) => {
  const { toast }          = useToast();
  const { refreshProfile } = useAuth();

  const [saving,   setSaving]   = useState(false);
  const [idProof,  setIdProof]  = useState(existing.identityProof  || "");
  const [compDoc,  setCompDoc]  = useState(existing.companyDocument || "");
  const [pitch,    setPitch]    = useState(existing.pitchDeck       || "");
  const [resume,   setResume]   = useState(existing.resumeLink      || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { identityProof: idProof };
      if (role === "startup") {
        payload.companyDocument = compDoc;
        payload.pitchDeck       = pitch;
      } else {
        payload.resumeLink = resume;
      }

      await profileApi.updateDocuments(payload);
      await refreshProfile();
      toast({ title: "Documents saved", description: "The admin will review your documents shortly." });
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = role === "startup"
    ? (idProof !== (existing.identityProof || "") || compDoc !== (existing.companyDocument || "") || pitch !== (existing.pitchDeck || ""))
    : (idProof !== (existing.identityProof || "") || resume !== (existing.resumeLink || ""));

  return (
    <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-orange-50 border-b border-orange-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
          <Upload size={15} className="text-orange-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-orange-800">Upload Verification Documents</p>
          <p className="text-xs text-orange-600">Required to activate / reinstate your account</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Upload your documents as Google Drive links. Make sure sharing is set to <strong>"Anyone with the link"</strong>.
            The admin will review and reinstate your account once verified.
          </p>
        </div>

        <DocInput
          label="Identity Proof *"
          hint="Google Drive link to Aadhaar / Passport / PAN card"
          value={idProof}
          onChange={setIdProof}
          saved={!!existing.identityProof}
        />

        {role === "startup" && (
          <>
            <DocInput
              label="Company / Business Document *"
              hint="Google Drive link to GST certificate / incorporation doc"
              value={compDoc}
              onChange={setCompDoc}
              saved={!!existing.companyDocument}
            />
            <DocInput
              label="Pitch Deck (optional)"
              hint="Google Drive link to your pitch deck"
              value={pitch}
              onChange={setPitch}
              saved={!!existing.pitchDeck}
            />
          </>
        )}

        {role === "freelancer" && (
          <DocInput
            label="Resume / CV *"
            hint="Google Drive link to your resume or CV"
            value={resume}
            onChange={setResume}
            saved={!!existing.resumeLink}
          />
        )}

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {saving ? "Saving…" : "Save Documents"}
        </button>
      </div>
    </div>
  );
};

export default DocumentUploadSection;
