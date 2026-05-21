import Navbar          from "@/components/Navbar";
import Hero            from "@/components/Hero";
import HowItWorks      from "@/components/HowItWorks";
import WhyCoHustle     from "@/components/WhyCoHustle";
import WhoIsItFor      from "@/components/WhoIsItFor";
import SampleProblemCard from "@/components/SampleProblemCard";
import TrustSection    from "@/components/TrustSection";
import FinalCTA        from "@/components/FinalCTA";
import Footer          from "@/components/Footer";
import { useAuth }           from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect }         from "react";

const Index = () => {
  const { user, profile, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && user && profile?.role && profile?.onboarded) {
      navigate(`/${profile.role}/dashboard`, { replace: true });
    }
    if (!loading && user && !profile?.role) {
      navigate("/select-role", { replace: true });
    }
  }, [loading, user, profile]);

  // Auto-trigger Google sign-in if ?signin=true and not logged in
  useEffect(() => {
    if (!loading && !user && searchParams.get("signin") === "true") {
      signInWithGoogle();
    }
  }, [loading, user, searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyCoHustle />
      <WhoIsItFor />
      <SampleProblemCard />
      <TrustSection />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
