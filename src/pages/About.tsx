import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Users, Target, Handshake, Zap, Globe, Shield, ArrowRight, Star } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Our Mission",
    description:
      "To make collaboration simple, fair, and accessible for startups and freelancers worldwide — no bidding wars, no gatekeeping.",
    color: "from-violet-500/20 to-purple-500/10",
    accent: "bg-violet-500",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "We're building a community where trust and quality matter more than the lowest price. Every person here is a partner, not a commodity.",
    color: "from-sky-500/20 to-blue-500/10",
    accent: "bg-sky-500",
  },
  {
    icon: Handshake,
    title: "Fair Opportunities",
    description:
      "No connects, no bidding. Just real problems and skilled people ready to solve them together, on equal footing.",
    color: "from-emerald-500/20 to-green-500/10",
    accent: "bg-emerald-500",
  },
];

const team = [
  {
    name: "Founders & Builders",
    description: "People who've shipped products and understand the pain of finding the right co-builder.",
    icon: Zap,
  },
  {
    name: "Global Perspective",
    description: "A distributed team that believes talent has no zip code, timezone, or pedigree.",
    icon: Globe,
  },
  {
    name: "Trust by Design",
    description: "Every feature is built around transparency — so both sides always know what to expect.",
    icon: Shield,
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-20 right-0 h-[300px] w-[300px] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Our Story
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Built for people
              <br />
              who build things.
            </h1>

            <p className="mt-10 text-xl leading-relaxed text-muted-foreground md:text-2xl">
              Co Hustle is a collaboration platform built for builders. We believe the best products come from people working{" "}
              <span className="font-semibold text-foreground">together</span> — not competing against each other in bidding wars.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="/apply"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Join the community <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">What we stand for</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three principles that guide every decision we make.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${v.color} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-background/60 p-2.5 backdrop-blur-sm">
                  <Icon className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{v.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Origin Story */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
                <span className="block h-px w-8 bg-primary" />
                The Origin
              </div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                Tired of the same old freelance marketplace?
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                We were too. Co Hustle was born out of frustration with platforms that pit skilled people against each other
                in a race to the bottom — where the cheapest bid wins, not the best fit.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                We imagined something different: a space where founders post real challenges, and collaborators
                apply with their genuine perspective — no price games, no middleman friction. Just two parties
                who want to build something great, finding each other.
              </p>
            </div>

            <div className="space-y-5">
              {team.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-start gap-5 rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-10 py-16 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/5" />
          </div>
          <h2 className="relative text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to hustle smarter?
          </h2>
          <p className="relative mt-4 text-lg text-primary-foreground/80">
            Join thousands of builders already collaborating on Co Hustle.
          </p>
          <a
            href="/apply"
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-background px-8 py-3.5 text-sm font-semibold text-foreground shadow-lg transition-all hover:opacity-90"
          >
            Get started for free <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
