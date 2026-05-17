import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

// ── Card ──────────────────────────────────────────────────────────────────────
export const ACard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-blue-900 bg-blue-950/60 ${className}`}>{children}</div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
export const StatCard = ({
  label, value, icon: Icon, color = "text-blue-400", bg = "bg-blue-900/50",
}: { label: string; value: number | string | undefined; icon: any; color?: string; bg?: string }) => (
  <ACard className="p-5 flex items-center gap-4">
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
      <p className="text-xs text-blue-400 mt-0.5">{label}</p>
    </div>
  </ACard>
);

// ── Loading spinner ───────────────────────────────────────────────────────────
export const Spinner = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
export const Empty = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <Icon className="h-12 w-12 text-blue-900 mb-4" />
    <p className="text-blue-500 text-sm">{text}</p>
  </div>
);

// ── Avatar ────────────────────────────────────────────────────────────────────
export const Avatar = ({ name, avatar, size = "md" }: { name?: string; avatar?: string; size?: "sm" | "md" }) => {
  const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  if (avatar) return <img src={avatar} className={`${cls} rounded-full object-cover ring-1 ring-blue-800`} alt="" />;
  return (
    <div className={`${cls} rounded-full bg-blue-700 flex items-center justify-center text-white font-bold shrink-0 ring-1 ring-blue-600`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
};

// ── Ver badge ─────────────────────────────────────────────────────────────────
export const VerBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending:      "bg-amber-900/60 text-amber-300 border-amber-700",
    approved:     "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    rejected:     "bg-red-900/60 text-red-300 border-red-700",
    more_info:    "bg-blue-800/60 text-blue-200 border-blue-600",
    not_required: "bg-blue-950 text-blue-500 border-blue-800",
  };
  const labels: Record<string, string> = {
    pending: "Pending", approved: "Approved", rejected: "Rejected",
    more_info: "Need Info", not_required: "N/A",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? map.not_required}`}>
      {labels[status] ?? status}
    </span>
  );
};

// ── Status pill ───────────────────────────────────────────────────────────────
export const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    open:        "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    closed:      "bg-blue-900/40 text-blue-400 border-blue-800",
    in_progress: "bg-amber-900/60 text-amber-300 border-amber-700",
    pending:     "bg-blue-900/40 text-blue-400 border-blue-800",
    resolved:    "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    dismissed:   "bg-blue-900/40 text-blue-500 border-blue-800",
    finalised:   "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    accepted:    "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    better_luck: "bg-red-900/60 text-red-300 border-red-800",
    selected:    "bg-blue-800/60 text-blue-200 border-blue-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status] ?? "bg-blue-900/40 text-blue-400 border-blue-800"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
};

// ── Filter pills ──────────────────────────────────────────────────────────────
export const FilterPills = ({
  options, value, onChange,
}: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-2 flex-wrap">
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
          value === o.value
            ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/50"
            : "border-blue-800 text-blue-400 hover:border-blue-600 hover:text-blue-200 bg-blue-950/40"
        }`}>
        {o.label}
      </button>
    ))}
  </div>
);

// ── Section header ────────────────────────────────────────────────────────────
export const SectionHeader = ({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) => (
  <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
    <div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      {sub && <p className="text-sm text-blue-400 mt-0.5">{sub}</p>}
    </div>
    {children}
  </div>
);

// ── Alert banner ──────────────────────────────────────────────────────────────
export const AlertBanner = ({ text, onClick, label, color = "amber" }: {
  text: string; onClick?: () => void; label?: string; color?: "amber" | "red";
}) => {
  const c = color === "red"
    ? "border-red-800 bg-red-950/60 text-red-300"
    : "border-amber-800 bg-amber-950/60 text-amber-300";
  const btn = color === "red"
    ? "border-red-700 text-red-300 hover:bg-red-900/50"
    : "border-amber-700 text-amber-300 hover:bg-amber-900/50";
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${c}`}>
      <span className="flex-1 text-sm font-medium">{text}</span>
      {label && onClick && (
        <button onClick={onClick} className={`text-xs border px-3 py-1 rounded-full transition-colors ${btn}`}>
          {label} →
        </button>
      )}
    </div>
  );
};

// ── Btn ───────────────────────────────────────────────────────────────────────
export const Btn = ({
  children, onClick, variant = "primary", size = "sm", disabled, className = "",
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary"|"danger"|"ghost"|"outline"|"success";
  size?: "sm"|"md"; disabled?: boolean; className?: string;
}) => {
  const base = "inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-900/50",
    danger:  "bg-red-700/80 text-white hover:bg-red-600",
    success: "bg-emerald-700/80 text-white hover:bg-emerald-600",
    ghost:   "text-blue-400 hover:text-white hover:bg-blue-900/60",
    outline: "border border-blue-800 text-blue-300 hover:border-blue-600 hover:text-white bg-transparent",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// ── Search input ──────────────────────────────────────────────────────────────
export const SearchInput = ({
  value, onChange, onSearch, placeholder = "Search...",
}: { value: string; onChange: (v: string) => void; onSearch?: () => void; placeholder?: string }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === "Enter" && onSearch?.()}
      placeholder={placeholder}
      className="pl-9 pr-4 py-2 text-sm bg-blue-950 border border-blue-800 rounded-lg text-blue-100 placeholder:text-blue-600 focus:outline-none focus:border-blue-500 w-56"
    />
  </div>
);
