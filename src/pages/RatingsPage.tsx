import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Star, ArrowLeft, Loader2, Users, CheckCircle,
  Flag, Ban, RotateCcw, ShieldOff, X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  ratingsApi, messagesApi, userActionsApi,
  type Rating, type BlockedUser,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ReportModal from "@/components/ReportModal";

// ── Star Rating Widget ────────────────────────────────────────────────────────
const StarRating = ({ value, onChange, size = 24 }: {
  value: number; onChange?: (n: number) => void; size?: number;
}) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n} type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"}
        >
          <Star
            size={size}
            className={n <= (hovered || value) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}
          />
        </button>
      ))}
    </div>
  );
};

// ── Person card ───────────────────────────────────────────────────────────────
const PersonCard = ({
  person, onRate, onReport, onBlock, alreadyRated, isBlocking,
}: {
  person: any;
  onRate: (p: any) => void;
  onReport: (p: any) => void;
  onBlock: (p: any) => void;
  alreadyRated?: Rating;
  isBlocking?: boolean;
}) => (
  <div className="flex items-center justify-between py-3.5 px-4 rounded-xl border border-gray-100 bg-white hover:border-primary/20 hover:bg-primary/5 transition-all">
    <div className="flex items-center gap-3">
      {person.avatar
        ? <img src={person.avatar} className="h-10 w-10 rounded-full object-cover" alt="" />
        : <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {person.fullName?.[0]?.toUpperCase()}
          </div>
      }
      <div>
        <p className="font-semibold text-sm text-gray-900">{person.fullName}</p>
        <p className="text-xs text-muted-foreground capitalize">{person.role}</p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {alreadyRated ? (
        <div className="flex flex-col items-end">
          <StarRating value={alreadyRated.rating} size={14} />
          <span className="text-xs text-muted-foreground mt-0.5">Rated</span>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => onRate(person)}>
          <Star size={13} className="mr-1" /> Rate
        </Button>
      )}
      {/* Report */}
      <button
        onClick={() => onReport(person)}
        title="Report this user"
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
      >
        <Flag size={13} />
      </button>
      {/* Block */}
      <button
        onClick={() => onBlock(person)}
        disabled={isBlocking}
        title="Block this user"
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40"
      >
        {isBlocking ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
      </button>
    </div>
  </div>
);

const ratingLabels: Record<number, string> = {
  1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent",
};

// ── Main Component ────────────────────────────────────────────────────────────
const RatingsPage = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { toast } = useToast();

  const [myRatings,    setMyRatings]    = useState<Rating[]>([]);
  const [givenRatings, setGivenRatings] = useState<Rating[]>([]);
  const [avgRating,    setAvgRating]    = useState<string | null>(null);
  const [contacts,     setContacts]     = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Rate dialog
  const [showRate,   setShowRate]   = useState(false);
  const [ratePerson, setRatePerson] = useState<any>(null);
  const [ratingVal,  setRatingVal]  = useState(5);
  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Report / block
  const [reportTarget, setReportTarget] = useState<{ _id: string; fullName: string; role?: string; avatar?: string } | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [showBlocked,  setShowBlocked]  = useState(false);
  const [blockingId,   setBlockingId]   = useState<string | null>(null);

  // ── Load all data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [
          { ratings: mine, averageRating },
          { conversations },
          givenResult,
          blockedResult,
        ] = await Promise.all([
          ratingsApi.getMine(),
          messagesApi.getConversations(),
          ratingsApi.getGiven().catch(() => ({ ratings: [] })),
          userActionsApi.getBlocked().catch(() => ({ blocked: [] })),
        ]);

        setMyRatings(mine || []);
        setAvgRating(averageRating);
        setGivenRatings((givenResult as any).ratings || []);

        const blocked: any[] = (blockedResult as any).blocked || [];
        setBlockedUsers(blocked);

        // Build blocked ID set for fast lookup
        const blockedIds = new Set(blocked.map((b: any) => b._id));

        // Build unique contacts list from conversations — excluding blocked users
        const seen   = new Set<string>();
        const people: any[] = [];
        (conversations || []).forEach((c: any) => {
          const other = c.otherUser;
          if (other && !seen.has(other._id) && !blockedIds.has(other._id)) {
            seen.add(other._id);
            people.push(other);
          }
        });
        setContacts(people);
      } catch (err) {
        // Non-fatal — show empty state
        console.error("RatingsPage load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // ── Block / unblock ──────────────────────────────────────────────────────────
  const handleBlock = async (person: any) => {
    setBlockingId(person._id);
    try {
      await userActionsApi.block(person._id);
      setBlockedUsers(prev => [...prev, {
        _id: person._id, fullName: person.fullName,
        email: person.email || "", avatar: person.avatar, role: person.role,
      }]);
      setContacts(prev => prev.filter(c => c._id !== person._id));
      toast({ title: `${person.fullName} blocked`, description: "They won't appear in your feed." });
    } catch (e: any) {
      toast({ title: "Failed to block", description: e.message, variant: "destructive" });
    } finally {
      setBlockingId(null);
    }
  };

  const handleUnblock = async (userId: string, name: string) => {
    try {
      await userActionsApi.unblock(userId);
      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
      toast({ title: `${name} unblocked` });
    } catch (e: any) {
      toast({ title: "Failed to unblock", description: e.message, variant: "destructive" });
    }
  };

  // ── Rate dialog ──────────────────────────────────────────────────────────────
  const openRateDialog = (person: any) => {
    setRatePerson(person);
    const existing = givenRatings.find(r =>
      (typeof r.revieweeId === "string" ? r.revieweeId : (r.revieweeId as any)?._id)?.toString() === person._id
    );
    setRatingVal(existing?.rating || 5);
    setComment(existing?.comment || "");
    setShowRate(true);
  };

  const handleSubmit = async () => {
    if (!ratingVal || !ratePerson) return;
    setSubmitting(true);
    try {
      const saved = await ratingsApi.submitByUser({
        revieweeId: ratePerson._id,
        rating:     ratingVal,
        comment:    comment.trim() || undefined,
      });
      setGivenRatings(prev => {
        const filtered = prev.filter(r =>
          (typeof r.revieweeId === "string" ? r.revieweeId : (r.revieweeId as any)?._id)?.toString() !== ratePerson._id
        );
        return [...filtered, saved];
      });
      toast({ title: "Rating submitted!" });
      setShowRate(false);
    } catch (e: any) {
      toast({ title: "Failed to submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Ratings & Reviews</h1>
              <button
                onClick={() => setShowBlocked(v => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-all"
              >
                <ShieldOff size={13} />
                Blocked {blockedUsers.length > 0 && `(${blockedUsers.length})`}
              </button>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">Rate collaborators and manage your block list.</p>
          </div>
        </div>

        {/* ── Blocked users panel ── */}
        {showBlocked && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-sm text-foreground">Blocked Users</p>
              <button onClick={() => setShowBlocked(false)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">You haven't blocked anyone.</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map(u => (
                  <div key={u._id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      {u.avatar
                        ? <img src={u.avatar} className="h-8 w-8 rounded-full object-cover opacity-60" alt="" />
                        : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                            {u.fullName?.[0]?.toUpperCase()}
                          </div>
                      }
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(u._id, u.fullName)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <RotateCcw size={11} /> Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">

            {/* Average rating */}
            {avgRating && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5">
                <div className="text-4xl font-bold text-primary">{avgRating}</div>
                <div>
                  <StarRating value={Math.round(parseFloat(avgRating))} size={20} />
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on {myRatings.length} review{myRatings.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Rate your contacts */}
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users size={16} /> People You've Collaborated With
              </h2>
              {contacts.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                  <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No connections yet. Start collaborating to rate people.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map(person => {
                    const given = givenRatings.find(r =>
                      (typeof r.revieweeId === "string" ? r.revieweeId : (r.revieweeId as any)?._id)?.toString() === person._id
                    );
                    return (
                      <PersonCard
                        key={person._id}
                        person={person}
                        onRate={openRateDialog}
                        onReport={(p) => setReportTarget(p)}
                        onBlock={handleBlock}
                        alreadyRated={given}
                        isBlocking={blockingId === person._id}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reviews received */}
            {myRatings.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Reviews Received</h2>
                <div className="space-y-3">
                  {myRatings.map(r => {
                    const reviewer = typeof r.reviewerId === "object" ? r.reviewerId as any : null;
                    return (
                      <Card key={r._id} className="border-gray-100">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                              {reviewer?.fullName?.[0] || "?"}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm text-gray-900">
                                  {reviewer?.fullName || "Anonymous"}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                                </span>
                              </div>
                              <StarRating value={r.rating} size={16} />
                              {r.comment && (
                                <p className="text-sm text-muted-foreground mt-1.5 italic">
                                  "{r.comment}"
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rate Dialog */}
        <Dialog open={showRate} onOpenChange={setShowRate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rate {ratePerson?.fullName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {ratePerson?.fullName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{ratePerson?.fullName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ratePerson?.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Your Rating</Label>
                <div className="flex items-center gap-3">
                  <StarRating value={ratingVal} onChange={setRatingVal} size={32} />
                  {ratingVal > 0 && (
                    <span className="text-sm font-medium text-primary">{ratingLabels[ratingVal]}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Comment <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  placeholder="Share your experience working with this person..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button className="w-full" disabled={!ratingVal || submitting} onClick={handleSubmit}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin mr-2" />Submitting...</>
                  : <>Submit Rating <Star size={14} className="ml-2 fill-current" /></>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* Report modal */}
      {reportTarget && (
        <ReportModal
          reportedUser={reportTarget}
          onClose={() => setReportTarget(null)}
          onReported={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};

export default RatingsPage;
