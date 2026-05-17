import { Clock, Sparkles, CheckCircle2, Mail } from "lucide-react";

interface VerificationPendingProps {
  startupName?: string;
  email?: string;
}

const steps = [
  { label: "Registration Submitted", done: true },
  { label: "Documents Under Review", done: false, active: true },
  { label: "Admin Verification", done: false },
  { label: "Full Access Granted", done: false },
];

const VerificationPending = ({ startupName = "Your Startup", email }: VerificationPendingProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

          <div className="p-8 md:p-10">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border-4 border-amber-100">
                <Clock className="h-9 w-9 text-amber-500" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400">
                  <Sparkles className="h-3 w-3 text-white" />
                </span>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">
                We're reviewing{" "}
                <span className="text-primary">{startupName}</span>!
              </h1>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Our team is verifying your documents and profile details.
                Hang tight — this usually takes{" "}
                <span className="font-semibold text-foreground">24–48 hours</span>.
              </p>
              {email && (
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-4 py-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  We'll notify you at <span className="font-medium text-foreground">{email}</span>
                </div>
              )}
            </div>

            {/* Progress Steps */}
            <div className="relative mb-8">
              {/* Connecting line */}
              <div className="absolute left-5 top-5 bottom-5 w-px bg-border" />

              <div className="space-y-4">
                {steps.map((step, i) => (
                  <div key={i} className="relative flex items-center gap-4">
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      step.done
                        ? "border-emerald-400 bg-emerald-50"
                        : step.active
                        ? "border-amber-400 bg-amber-50 animate-pulse"
                        : "border-border bg-background"
                    }`}>
                      {step.done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : step.active ? (
                        <Clock className="h-5 w-5 text-amber-500" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-border" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        step.done ? "text-emerald-700" :
                        step.active ? "text-amber-700" :
                        "text-muted-foreground"
                      }`}>
                        {step.label}
                      </p>
                      {step.active && (
                        <p className="text-xs text-muted-foreground mt-0.5">In progress · usually 24–48 hours</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Happy collaborating message */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5 text-center">
              <p className="text-lg font-bold text-foreground">
                Happy Collaborating! 🚀
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                While you wait, explore the platform, browse problems, and get familiar with how CoHustle works.
              </p>
              <a
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
              >
                Explore CoHustle
              </a>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Questions? Contact us at{" "}
          <a href="mailto:support@cohustle.com" className="underline hover:text-foreground transition-colors">
            support@cohustle.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default VerificationPending;
