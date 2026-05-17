import { Shield, LogOut, ExternalLink } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminNavbar = () => {
  const { user, signOut } = useAdminAuth();

  return (
    <header className="h-14 border-b border-blue-800 bg-blue-950 flex items-center px-6 gap-4 sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-white tracking-tight">CoHustle</span>
          <span className="text-xs font-semibold text-blue-400 bg-blue-900 px-2 py-0.5 rounded-full border border-blue-700">
            Admin
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Back to site */}
      <a
        href="/"
        className="hidden sm:flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-200 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Back to CoHustle
      </a>

      {/* User */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-white">{user.fullName}</span>
            <span className="text-xs text-blue-400">{user.email}</span>
          </div>
          {user.avatar ? (
            <img src={user.avatar} className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-600" alt="" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-blue-500">
              {user.fullName?.[0]?.toUpperCase()}
            </div>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default AdminNavbar;
