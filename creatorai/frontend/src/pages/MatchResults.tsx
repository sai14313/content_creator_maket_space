import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  GitCompareArrows,
  Info,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import type { Brief, Invitation, MatchResponse, MatchResult } from "../lib/types";
import MatchScorePanel from "../components/MatchScorePanel";
import Modal from "../components/Modal";
import {
  AvailabilityBadge,
  ErrorBox,
  PageLoader,
  StarRating,
  StatusBadge,
  SuccessBox,
  formatMoney,
} from "../components/ui";
import { useCompare } from "../context/CompareContext";

export default function MatchResults() {
  const { id } = useParams();
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState("");
  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());

  // Invite modal
  const [inviteTarget, setInviteTarget] = useState<MatchResult | null>(null);
  const [message, setMessage] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [inviteOk, setInviteOk] = useState("");
  const [busy, setBusy] = useState(false);

  const { isSelected, toggle } = useCompare();

  const load = useCallback(() => {
    setData(null);
    api<MatchResponse>(`/api/matches/${id}`)
      .then((res) => {
        setData(res);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  const openInvite = (match: MatchResult) => {
    setInviteTarget(match);
    setInviteErr("");
    setInviteOk("");
    setMessage(
      `Hi ${match.creator.full_name.split(" ")[0]} — you're one of our top matches for "${data?.brief.title}". We'd love to invite you to submit a proposal.`
    );
  };

  const sendInvite = async () => {
    if (!inviteTarget || !data) return;
    setBusy(true);
    setInviteErr("");
    setInviteOk("");
    try {
      const inv = await api<Invitation>("/api/invitations", {
        method: "POST",
        body: {
          brief_id: data.brief.id,
          creator_id: inviteTarget.creator.id,
          message,
        },
      });
      setInvitedIds((prev) => new Set(prev).add(inviteTarget.creator.id));
      setInviteOk(`Invitation sent to ${inviteTarget.creator.full_name}!`);
      setTimeout(() => setInviteTarget(null), 1200);
    } catch (err) {
      setInviteErr(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <div className="container-page py-16">
        <ErrorBox message={error} />
        <Link to="/briefs" className="btn-secondary mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to briefs
        </Link>
      </div>
    );
  if (!data) return <PageLoader label="Running the matching engine…" />;

  const weights = data.weights;

  return (
    <div className="container-page py-10">
      <Link to="/briefs" className="btn-ghost mb-4 -ml-2 !px-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> My briefs
      </Link>

      {/* Brief summary */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {data.brief.title}
              </h1>
              <StatusBadge status={data.brief.status} />
            </div>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">{data.brief.objective}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-slate-800">
              {formatMoney(data.brief.budget_min)} – {formatMoney(data.brief.budget_max)}
            </p>
            <p className="text-xs text-slate-400">due {data.brief.deadline}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[...data.brief.required_skills, ...data.brief.required_tools].map((t) => (
            <span key={t} className="chip-slate">{t}</span>
          ))}
        </div>
      </div>

      {/* Algorithm explanation */}
      <div className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              How these matches were calculated
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{data.algorithm}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(weights).map(([k, v]) => (
                <span key={k} className="badge bg-white text-indigo-700 shadow-sm">
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          Ranked creators ({data.results.length})
        </h2>
        <span className="text-xs text-slate-400">sorted by MatchScore ↓</span>
      </div>


      <div className="mt-4 space-y-5">
        {data.results.map((match, idx) => {
          const invited = invitedIds.has(match.creator.id);
          const selected = isSelected(match.creator.id);
          return (
            <article key={match.creator.id} className="card overflow-hidden">
              <div className="grid gap-0 lg:grid-cols-5">
                {/* Creator column */}
                <div className="p-5 lg:col-span-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-slate-300">#{idx + 1}</span>
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${match.creator.avatar_gradient} text-lg font-extrabold text-white`}
                    >
                      {match.creator.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/creators/${match.creator.id}`}
                        className="text-base font-bold text-slate-900 hover:text-violet-700"
                      >
                        {match.creator.full_name}
                      </Link>
                      <p className="line-clamp-2 text-xs text-slate-500">
                        {match.creator.headline}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StarRating rating={match.creator.rating} count={match.creator.review_count} />
                        <AvailabilityBadge availability={match.creator.availability} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {match.creator.specialties.map((s) => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {formatMoney(match.creator.price_min)} – {formatMoney(match.creator.price_max)}
                    </span>
                    {" · "}{match.creator.experience_years} yrs · {match.creator.completed_projects} projects
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => openInvite(match)}
                      className="btn-primary h-9"
                      disabled={invited}
                    >
                      <Send className="h-4 w-4" />
                      {invited ? "Invited ✓" : "Send invitation"}
                    </button>
                    <button
                      onClick={() => {
                        const err = toggle(match.creator);
                        if (err) alert(err);
                      }}
                      className={`btn h-9 ${selected ? "border border-indigo-200 bg-indigo-50 text-indigo-700" : "btn-secondary"}`}
                    >
                      <GitCompareArrows className="h-4 w-4" /> Compare
                    </button>
                    <Link to={`/creators/${match.creator.id}`} className="btn-ghost h-9">
                      Profile
                    </Link>
                  </div>
                </div>


                {/* Score column */}
                <div className="border-t border-slate-100 p-5 lg:col-span-3 lg:border-l lg:border-t-0">
                  <MatchScorePanel match={match} weights={weights} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteTarget !== null}
        onClose={() => setInviteTarget(null)}
        title={inviteTarget ? `Invite ${inviteTarget.creator.full_name}` : ""}
      >
        <div className="space-y-4">
          {inviteErr && <ErrorBox message={inviteErr} />}
          {inviteOk && <SuccessBox message={inviteOk} />}
          <div>
            <label className="label">Message</label>
            <textarea
              className="input min-h-[110px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
          </div>
          <p className="flex gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
            The creator sees this invitation on their dashboard and can accept it
            and submit a proposal.
          </p>
          <button onClick={sendInvite} className="btn-primary w-full" disabled={busy}>
            <Send className="h-4 w-4" />
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

