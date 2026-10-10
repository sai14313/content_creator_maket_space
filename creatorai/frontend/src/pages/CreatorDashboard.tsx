import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  FileText,
  FolderKanban,
  Images,
  Inbox,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import type { Invitation, Project, Proposal } from "../lib/types";
import Modal from "../components/Modal";
import {
  ErrorBox,
  PageLoader,
  StatCard,
  StatusBadge,
  SuccessBox,
  formatDate,
  formatMoney,
} from "../components/ui";

interface CreatorStats {
  invitations: number;
  pending_invitations: number;
  proposals: number;
  active_projects: number;
  delivered: number;
}

export default function CreatorDashboard() {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");

  // Proposal modal
  const [target, setTarget] = useState<Invitation | null>(null);
  const [cover, setCover] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState("14");
  const [modalErr, setModalErr] = useState("");
  const [modalOk, setModalOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api<Invitation[]>("/api/invitations"),
      api<Proposal[]>("/api/proposals"),
      api<Project[]>("/api/projects"),
    ])
      .then(([inv, prop, proj]) => {
        setInvitations(inv);
        setProposals(prop);
        setProjects(proj);
        setStats({
          invitations: inv.length,
          pending_invitations: inv.filter((i) => i.status === "sent").length,
          proposals: prop.length,
          active_projects: proj.filter(
            (p) => !["delivered", "declined"].includes(p.status)
          ).length,
          delivered: proj.filter((p) => p.status === "delivered").length,
        });
        setError("");
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const respond = async (inv: Invitation, action: "accept" | "decline") => {
    setBusyId(inv.id);
    try {
      await api(`/api/invitations/${inv.id}/respond`, {
        method: "POST",
        body: { action },
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const openProposal = (inv: Invitation) => {
    setTarget(inv);
    setModalErr("");
    setModalOk("");
    setCover(
      `Hi — excited about "${inv.brief_title}"! I'd love to produce this with my AI pipeline and can deliver in the planned timeline.`
    );
    setBudget("3000");
    setDays("14");
  };

  const submitProposal = async () => {
    if (!target) return;
    if (cover.trim().length < 20) {
      setModalErr("Cover letter must be at least 20 characters.");
      return;
    }
    if (Number(budget) <= 0) {
      setModalErr("Enter a proposed budget.");
      return;
    }
    setBusy(true);
    setModalErr("");
    try {
      const prop = await api<Proposal>("/api/proposals", {
        method: "POST",
        body: {
          project_id: target.project_id,
          cover_letter: cover.trim(),
          proposed_budget: Number(budget),
          timeline_days: Number(days),
        },
      });
      setProposals((prev) => [prop, ...prev]);
      setModalOk("Proposal submitted! The brand will review it shortly.");
      load();
      setTimeout(() => setTarget(null), 1300);
    } catch (err) {
      setModalErr(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  };


  if (!stats && !error) return <PageLoader label="Loading dashboard…" />;

  const pendingInvites = invitations.filter((i) => i.status === "sent");

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Creator dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Respond to invitations, submit proposals and track your projects.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/creator/portfolio" className="btn-secondary">
            <Images className="h-4 w-4" /> Portfolio
          </Link>
          <Link to="/creator/briefs" className="btn-primary">
            <FileText className="h-4 w-4" /> Browse briefs
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Inbox} label="Invitations" value={stats?.invitations ?? 0} hint={`${stats?.pending_invitations ?? 0} awaiting response`} />
        <StatCard icon={Send} label="Proposals" value={stats?.proposals ?? 0} gradient="from-indigo-500 to-blue-600" />
        <StatCard icon={FolderKanban} label="Active projects" value={stats?.active_projects ?? 0} gradient="from-amber-500 to-orange-600" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats?.delivered ?? 0} gradient="from-emerald-500 to-teal-600" />
        <StatCard
          icon={Sparkles}
          label="Est. earnings"
          value={formatMoney(
            projects
              .filter((p) => p.status === "delivered")
              .reduce((sum, p) => sum + p.agreed_budget, 0)
          )}
          hint="from delivered projects"
          gradient="from-fuchsia-500 to-pink-600"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Invitations */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Invitations</h2>
            <span className="badge bg-violet-50 text-violet-700">
              {pendingInvites.length} pending
            </span>
          </div>
          {invitations.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500">
              No invitations yet. Keep your portfolio sharp — brands discover you
              through the marketplace and match results.
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <article key={inv.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-slate-900">
                          {inv.brief_title}
                        </p>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-slate-400">
                        from {inv.brand_name} · {formatDate(inv.created_at)}
                      </p>
                    </div>
                  </div>
                  {inv.message && (
                    <p className="mt-2 rounded-xl bg-violet-50/60 p-3 text-xs italic leading-relaxed text-slate-600">
                      “{inv.message}”
                    </p>
                  )}
                  {inv.status === "sent" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        className="btn-primary h-9 flex-1"
                        disabled={busyId === inv.id}
                        onClick={() => respond(inv, "accept")}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Accept
                      </button>
                      <button
                        className="btn-danger h-9"
                        disabled={busyId === inv.id}
                        onClick={() => respond(inv, "decline")}
                      >
                        <XCircle className="h-4 w-4" /> Decline
                      </button>
                    </div>
                  )}
                  {inv.status === "accepted" && (
                    <div className="mt-3">
                      <button className="btn-primary h-9 w-full" onClick={() => openProposal(inv)}>
                        <Send className="h-4 w-4" /> Submit proposal
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>


        <section>
          {/* My proposals */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">My proposals</h2>
            <span className="badge bg-indigo-50 text-indigo-700">{proposals.length} total</span>
          </div>
          {proposals.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500">
              No proposals yet — accept an invitation to submit one, or apply to an
              open brief.
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((p) => (
                <article key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {p.brief_title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.brand_name} · {formatDate(p.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {formatMoney(p.proposed_budget)}
                    </span>
                    <span className="text-slate-400">{p.timeline_days} days</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* My projects */}
          <div className="mb-3 mt-8 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">My projects</h2>
            <Link to="/projects" className="text-sm font-semibold text-violet-600 hover:underline">
              View all
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500">
              No projects yet — accepted proposals become projects here.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="card flex items-center justify-between gap-3 p-4 transition hover:border-violet-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{p.title}</p>
                    <p className="text-xs text-slate-500">
                      {p.brand_name} · {formatMoney(p.agreed_budget)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Proposal modal */}
      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target ? `Proposal for ${target.brief_title}` : ""}
        wide
      >
        <div className="space-y-4">
          {modalErr && <ErrorBox message={modalErr} />}
          {modalOk && <SuccessBox message={modalOk} />}
          <div>
            <label className="label">Cover letter *</label>
            <textarea
              className="input min-h-[140px]"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              maxLength={4000}
            />
            <p className="mt-1 text-xs text-slate-400">{cover.length}/4000 characters</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Proposed budget ($) *</label>
              <input
                type="number" min={1} className="input"
                value={budget} onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Timeline (days) *</label>
              <input
                type="number" min={1} max={365} className="input"
                value={days} onChange={(e) => setDays(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={submitProposal}
            className="btn-primary w-full"
            disabled={busy}
          >
            <Send className="h-4 w-4" />
            {busy ? "Submitting…" : "Submit proposal"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

