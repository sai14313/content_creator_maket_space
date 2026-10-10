import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { api } from "../lib/api";
import type { Creator } from "../lib/types";
import CreatorCard from "../components/CreatorCard";
import { PageLoader } from "../components/ui";

const FEATURES = [
  {
    icon: Search,
    title: "Creator discovery",
    text: "Search AI creators by specialty, tools, budget, availability and ratings — with rich portfolios.",
  },
  {
    icon: Wand2,
    title: "Smart creative briefs",
    text: "Write a one-line idea and generate a structured brief: audience, style, deliverables, budget and rights.",
  },
  {
    icon: Sparkles,
    title: "Explainable matching",
    text: "Every match shows a /100 score broken into five weighted components with plain-English reasons.",
  },
  {
    icon: Zap,
    title: "Full project workflow",
    text: "Invitation → proposal → production → review → revision → approval → delivery, persisted end-to-end.",
  },
  {
    icon: GitCompareArrows,
    title: "Compare up to 3",
    text: "Shortlist and compare candidates side-by-side before you commit budget.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based & secure",
    text: "JWT auth, hashed passwords, validated inputs and safe file uploads out of the box.",
  },
];

const STEPS = [
  { n: "1", t: "Publish a brief", d: "Describe the campaign, budget and deadline — or generate it from a single idea." },
  { n: "2", t: "Review AI matches", d: "Get a ranked shortlist with explainable scores across skills, portfolio, budget and availability." },
  { n: "3", t: "Invite & negotiate", d: "Send invitations, receive proposals, accept the best fit and start production." },
  { n: "4", t: "Deliver & review", d: "Track milestones, upload deliverables, request revisions, approve and close the project." },
];

export default function Landing() {
  const [featured, setFeatured] = useState<Creator[] | null>(null);

  useEffect(() => {
    api<Creator[]>("/api/creators?sort=rating")
      .then((all) => setFeatured(all.slice(0, 3)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="container-page grid gap-10 py-20 lg:grid-cols-2 lg:py-28">
          <div className="max-w-2xl">
            <span className="chip !px-3 !py-1">
              <Sparkles className="h-3.5 w-3.5" /> HacXLerate 2026 · AI-native marketplace
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Where brands meet the{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                world's AI creators
              </span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Publish a creative brief, get explainable AI match scores for every
              creator, and manage the whole engagement — from invitation to final
              delivery — in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/briefs/new" className="btn-primary px-6 py-3 text-base">
                Publish a brief <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/discover" className="btn-secondary px-6 py-3 text-base">
                Browse creators
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {["8+ demo creators", "5 weighted match factors", "Full workflow persistence"].map(
                (t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Hero visual: floating match card */}
          <div className="relative hidden lg:block">
            <div className="card absolute right-4 top-4 w-72 rotate-2 p-5">
              <div className="flex items-center justify-between">
                <span className="chip">AI match</span>
                <span className="text-3xl font-extrabold text-violet-600">92</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Aria Chen · AI filmmaker
              </p>
              <div className="mt-3 space-y-2">
                {([["Skills", 95], ["Portfolio", 88], ["Budget", 100]] as const).map(
                  ([l, v]) => (
                    <div key={l}>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{l}</span>
                        <span>{v}%</span>
                      </div>
                      <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          style={{ width: `${v}%` }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="card absolute bottom-6 left-0 w-64 -rotate-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                New proposal
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                “Silent Roads launch film”
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ₹11,000 · 21 days · submitted by Aria C.
              </p>
              <div className="mt-3 flex gap-2">
                <span className="badge bg-emerald-50 text-emerald-700">Accept</span>
                <span className="badge bg-slate-100 text-slate-600">Review</span>
              </div>
            </div>
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-violet-200/40 to-indigo-200/40 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="section-title">Everything a campaign needs</h2>
            <p className="mt-3 text-slate-500">
              One workspace for discovery, briefs, matching and delivery.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 transition hover:-translate-y-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured creators */}
      <section className="bg-slate-50 py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Featured creators</h2>
              <p className="mt-2 text-slate-500">Top-rated AI talent on the marketplace.</p>
            </div>
            <Link to="/discover" className="btn-secondary">
              View marketplace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8">
            {featured === null ? (
              <PageLoader label="Loading creators…" />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((c) => (
                  <CreatorCard key={c.id} creator={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="section-title">How it works</h2>
            <p className="mt-3 text-slate-500">From idea to delivered campaign in four steps.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-extrabold text-white shadow-md">
                  {s.n}
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{s.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-700 px-8 py-14 text-center shadow-xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to launch your next AI campaign?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-violet-100">
              Log in with a demo brand account, publish a brief in minutes and see
              explainable matches instantly.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="btn bg-white px-6 py-3 text-violet-700 hover:bg-violet-50"
              >
                Create free account
              </Link>
              <Link
                to="/login"
                className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10"
              >
                Use demo login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

