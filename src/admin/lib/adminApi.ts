// ── Admin API — completely self-contained ──────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  return localStorage.getItem("cohustle_token");
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: "startup" | "freelancer" | null;
  onboarded: boolean;
  verificationStatus: "not_required" | "pending" | "approved" | "rejected" | "more_info";
  verificationRejectionReason?: string;
  suspended: boolean;
  tags: string[];
  createdAt: string;
}

export interface VerificationEntry extends AdminUser {
  profile: {
    startupName: string;
    industry?: string;
    fundingStage?: string;
    website?: string;
    location?: string;
    teamSize?: string;
    description?: string;
    companyDocument?: string;
    identityProof?: string;
    pitchDeck?: string;
  } | null;
}

export interface AdminProblem {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  status: "open" | "in_progress" | "closed";
  budget?: string;
  timeline?: string;
  location?: string;
  applicationCount: number;
  createdAt: string;
  startupUserId: { _id: string; fullName: string; email: string; avatar?: string } | string;
}

export interface AdminApplication {
  _id: string;
  problemTitle: string;
  status: string;
  skills: string[];
  createdAt: string;
  startupUserId:    { _id: string; fullName: string; email: string; avatar?: string } | string;
  freelancerUserId: { _id: string; fullName: string; email: string; avatar?: string } | string;
}

export interface AdminCollabRequest {
  _id: string;
  title: string;
  description: string;
  lookingFor: string;
  tags: string[];
  status: "open" | "closed";
  createdAt: string;
  userId: { _id: string; fullName: string; email: string; role: string } | string;
}

export interface AdminRating {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewerId:  { _id: string; fullName: string; email: string; avatar?: string } | string;
  revieweeId:  { _id: string; fullName: string; email: string; avatar?: string } | string;
}

export interface AdminReport {
  _id: string;
  reason: string;
  description: string;
  status: "open" | "resolved" | "dismissed";
  adminNote?: string;
  createdAt: string;
  reporterUserId: { _id: string; fullName: string; email: string; avatar?: string; role: string };
  reportedUserId: { _id: string; fullName: string; email: string; avatar?: string; role: string };
}

export interface AdminAnnouncement {
  _id: string;
  message: string;
  target: "all" | "startup" | "freelancer";
  createdAt: string;
  sentBy: { _id: string; fullName: string; email: string };
}

export interface AdminStats {
  totalUsers: number;
  startups: number;
  freelancers: number;
  totalProblems: number;
  openProblems: number;
  totalApplications: number;
  acceptedApplications: number;
  collabRequests: number;
  milestones: number;
  ratings: number;
  pendingVerifications: number;
  openReports: number;
  suspended: number;
}

export interface AnalyticsData {
  signupsByDay:  { _id: string; count: number }[];
  problemsByDay: { _id: string; count: number }[];
  verStats:      { _id: string; count: number }[];
}

// ── API methods ────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => req<{ stats: AdminStats }>("/admin/stats"),

  getUsers: (p?: { role?: string; search?: string; suspended?: boolean; page?: number }) => {
    const q = new URLSearchParams();
    if (p?.role)      q.set("role",      p.role);
    if (p?.search)    q.set("search",    p.search);
    if (p?.suspended) q.set("suspended", "true");
    if (p?.page)      q.set("page",      String(p.page));
    return req<{ users: AdminUser[]; total: number }>(`/admin/users?${q}`);
  },
  deleteUser:  (id: string) => req(`/admin/users/${id}`, { method: "DELETE" }),
  suspendUser: (id: string, suspended: boolean) =>
    req<{ user: AdminUser }>(`/admin/users/${id}/suspend`, { method: "PATCH", body: JSON.stringify({ suspended }) }),

  getVerifications: (p?: { status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (p?.status) q.set("status", p.status);
    if (p?.page)   q.set("page",   String(p.page));
    return req<{ verifications: VerificationEntry[]; total: number }>(`/admin/verifications?${q}`);
  },
  approve:  (id: string)                => req<{ user: AdminUser }>(`/admin/verifications/${id}/approve`,   { method: "POST" }),
  reject:   (id: string, reason: string) => req<{ user: AdminUser }>(`/admin/verifications/${id}/reject`,   { method: "POST", body: JSON.stringify({ reason }) }),
  moreInfo: (id: string)                => req<{ user: AdminUser }>(`/admin/verifications/${id}/more-info`, { method: "POST" }),

  getProblems: (p?: { status?: string; search?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (p?.status) q.set("status", p.status);
    if (p?.search) q.set("search", p.search);
    if (p?.page)   q.set("page",   String(p.page));
    return req<{ problems: AdminProblem[]; total: number }>(`/admin/problems?${q}`);
  },
  deleteProblem: (id: string) => req(`/admin/problems/${id}`, { method: "DELETE" }),

  getApplications: (p?: { status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (p?.status) q.set("status", p.status);
    if (p?.page)   q.set("page",   String(p.page));
    return req<{ applications: AdminApplication[]; total: number }>(`/admin/applications?${q}`);
  },

  getCollabRequests: (p?: { status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (p?.status) q.set("status", p.status);
    if (p?.page)   q.set("page",   String(p.page));
    return req<{ collabRequests: AdminCollabRequest[]; total: number }>(`/admin/collab-requests?${q}`);
  },
  deleteCollabRequest: (id: string) => req(`/admin/collab-requests/${id}`, { method: "DELETE" }),

  getRatings: () => req<{ ratings: AdminRating[] }>("/admin/ratings"),

  getReports: (p?: { status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (p?.status) q.set("status", p.status);
    if (p?.page)   q.set("page",   String(p.page));
    return req<{ reports: AdminReport[]; total: number }>(`/admin/reports?${q}`);
  },
  updateReport: (id: string, status: "resolved" | "dismissed", adminNote?: string) =>
    req<{ report: AdminReport }>(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status, adminNote }) }),

  getAnnouncements: () => req<{ announcements: AdminAnnouncement[] }>("/admin/announcements"),
  sendAnnouncement: (message: string, target: "all" | "startup" | "freelancer") =>
    req<{ announcement: AdminAnnouncement }>("/admin/announcements", { method: "POST", body: JSON.stringify({ message, target }) }),

  getAnalytics: () => req<AnalyticsData>("/admin/analytics"),
};
