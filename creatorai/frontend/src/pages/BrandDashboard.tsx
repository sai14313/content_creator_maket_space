import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  FileText,
  FolderKanban,
  Plus,
  Send,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import type { Brief, Invitation, Project, Proposal } from "../lib/types";
import {
  PageLoader,
  StatCard,
  StatusBadge,
  formatDate,
  formatMoney,
} from "../components/ui";

interface BrandStats {
  briefs: number;
  published: number;
  invitations: number;
  proposals: number;
  active_projects: number;
  delivered: number;
}

export default function BrandDashboard() {
  const [stats, setStats] = useState<BrandStats | null>(null);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api<Brief[]>("/api/briefs?mine=true"),
      api<Proposal[]>("/api/proposals"),
      api<Project[]>("/api/projects"),
      api<Invitation[]>("/api/invitations"),
    ])
      .then(([b, p, pr, inv]) => {
        setBriefs(b);
        setProposals(p);
        setProjects(pr);
        setInvitations(inv);
        setStats({
          briefs: b.length,
          published: b.filter((x) => x.status === "published").length,
          invitations: inv.length,
          proposals: p.length,
          active_projects: pr.filter(
            (x) => !["delivered", "declined"].includes(x.status)
          ).length,
          delivered: pr.filter((x) => x.status === "delivered").length,
        });
        setError("");
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const decideProposal = async (p: Proposal, action: "accept" | "decline") => {
    if (action === "accept" && !window.confirm(`Accept ${p.creator_name}'s proposal of ${formatMoney(p.proposed_budget)}? The project moves to In Production.`)) {
      return;
    }
    if (action === "decline" && !window.confirm(`Reject ${p.creator_name}'s proposal?`)) {
      return;
    }
    setBusyId(p.id);
    try {
      await api<Proposal>(`/api/proposals/${p.id}/decision`, {
        method: "POST",
        body: { action },
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Decision failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (!stats && !error) return <PageLoader label="Loading dashboard…" />;

  const pendingProposals = proposals.filter((p) => p.status === "submitted");
  const recentBriefs = briefs.slice(0, 4);
  const activeProjects = projects.filter(
    (p) => !["delivered", "declined"].includes(p.status)
  );

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Brand dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Publish briefs, review proposals and manage active engagements.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/discover" className="btn-secondary">
            <Users className="h-4 w-4" /> Discover creators
          </Link>
          <Link to="/briefs/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New brief
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={FileText} label="Briefs" value={stats?.briefs ?? 0} hint={`${stats?.published ?? 0} published`} />
        <StatCard icon={Send} label="Invitations" value={stats?.invitations ?? 0} gradient="from-indigo-500 to-blue-600" />
        <StatCard icon={Sparkles} label="Proposals" value={stats?.proposals ?? 0} hint={`${pendingProposals.length} awaiting review`} gradient="from-fuchsia-500 to-pink-600" />
        <StatCard icon={FolderKanban} label="Active projects" value={stats?.active_projects ?? 0} gradient="from-amber-500 to-orange-600" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats?.delivered ?? 0} gradient="from-emerald-500 to-teal-600" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Proposals awaiting decision */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Proposals received</h2>
            <span className="badge bg-violet-50 text-violet-700">{pendingProposals.length} pending</span>
          </div>
          {pendingProposals.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500">
              No pending proposals. Invite creators from a brief's match results to
              get proposals flowing.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProposals.map((p) => (
                <article key={p.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{p.creator_name}</p>
                      <p className="text-sm text-slate-500">
                        for <span className="font-medium text-slate-700">{p.brief_title}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-slate-900">
                        {formatMoney(p.proposed_budget)}
                      </p>
                      <p className="text-xs text-slate-400">{p.timeline_days} days</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                    {p.cover_letter}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="btn-primary h-9 flex-1"
                      disabled={busyId === p.id}
                      onClick={() => decideProposal(p, "accept")}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Accept & start
                    </button>
                    <button
                      className="btn-danger h-9"
                      disabled={busyId === p.id}
                      onClick={() => decideProposal(p, "decline")}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <Link to={`/projects/${p.project_id}`} className="btn-secondary h-9">
                      Open
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>


        <section>
          {/* Recent briefs */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent briefs</h2>
            <Link to="/briefs" className="text-sm font-semibold text-violet-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentBriefs.length === 0 && (
              <div className="card p-6 text-sm text-slate-500">
                No briefs yet — create one to start matching.
              </div>
            )}
            {recentBriefs.map((b) => (
              <article key={b.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{b.title}</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {b.content_type} · {formatMoney(b.budget_min)}–{formatMoney(b.budget_max)}
                    {" · "}due {b.deadline || "—"}
                  </p>
                </div>
                {b.status !== "draft" && (
                  <Link to={`/briefs/${b.id}/matches`} className="btn-primary h-9 shrink-0">
                    <Sparkles className="h-4 w-4" /> Matches
                  </Link>
                )}
              </article>
            ))}
          </div>

          {/* Active projects */}
          <div className="mb-3 mt-8 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Active projects</h2>
            <Link to="/projects" className="text-sm font-semibold text-violet-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {activeProjects.length === 0 && (
              <div className="card p-6 text-sm text-slate-500">
                No active projects — accept a proposal to start one.
              </div>
            )}
            {activeProjects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="card flex items-center justify-between gap-3 p-4 transition hover:border-violet-300"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    with {p.creator_name} · {formatMoney(p.agreed_budget)}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>

          {/* Sent invitations */}
          <div className="mb-3 mt-8 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Invitations sent</h2>
          </div>
          <div className="space-y-3">
            {invitations.length === 0 && (
              <div className="card p-6 text-sm text-slate-500">
                No invitations sent yet — invite creators from match results.
              </div>
            )}
            {invitations.slice(0, 4).map((inv) => (
              <article key={inv.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {inv.creator_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{inv.brief_title}</p>
                </div>
                <StatusBadge status={inv.status} />
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

