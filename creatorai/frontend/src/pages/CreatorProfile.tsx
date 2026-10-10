import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Check,
  Clock,
  GitCompareArrows,
  Heart,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import type { Brief, Creator, Invitation, PortfolioItem } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import Modal from "../components/Modal";
import {
  AvailabilityBadge,
  ErrorBox,
  PageLoader,
  StarRating,
  SuccessBox,
  formatMoney,
} from "../components/ui";

export default function CreatorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isSelected, toggle } = useCompare();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [error, setError] = useState("");
  const [shortlisted, setShortlisted] = useState(false);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [briefId, setBriefId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);

  const load = useCallback(() => {
    api<Creator>(`/api/creators/${id}`)
      .then(setCreator)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (user?.role !== "brand") return;
    api<{ creator: Creator }[]>("/api/shortlists")
      .then((rows) => setShortlisted(rows.some((r) => r.creator.id === Number(id))))
      .catch(() => undefined);
    api<Brief[]>("/api/briefs?mine=true")
      .then((rows) => setBriefs(rows.filter((b) => b.status === "published")))
      .catch(() => undefined);
  }, [user, id]);

  const handleShortlist = async () => {
    if (!creator) return;
    try {
      if (shortlisted) {
        await api<void>(`/api/shortlists/${creator.id}`, { method: "DELETE" });
        setShortlisted(false);
      } else {
        await api("/api/shortlists", { method: "POST", body: { creator_id: creator.id } });
        setShortlisted(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update shortlist.");
    }
  };

  const openInvite = () => {
    setInviteErr("");
    setInviteMsg("");
    setMessage(
      `Hi ${creator?.full_name.split(" ")[0]} — we loved your portfolio and would like to invite you to our brief.`
    );
    setBriefId(briefs.length > 0 ? briefs[0].id : "");
    setInviteOpen(true);
  };

  const sendInvite = async () => {
    if (!creator || briefId === "") {
      setInviteErr("Choose a published brief first.");
      return;
    }
    setInviteBusy(true);
    setInviteErr("");
    try {
      await api<Invitation>("/api/invitations", {
        method: "POST",
        body: { brief_id: briefId, creator_id: creator.id, message },
      });
      setInviteMsg(`Invitation sent to ${creator.full_name}! Track it under Projects.`);
      setTimeout(() => setInviteOpen(false), 1400);
    } catch (err) {
      setInviteErr(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setInviteBusy(false);
    }
  };

  if (error)
    return (
      <div className="container-page py-16">
        <ErrorBox message={error} />
        <Link to="/discover" className="btn-secondary mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </div>
    );

  if (!creator) return <PageLoader label="Loading profile…" />;

  const selected = isSelected(creator.id);

  return (
    <div className="container-page py-10">
      <Link to="/discover" className="btn-ghost mb-4 -ml-2 !px-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      {/* Profile header */}
      <div className="card overflow-hidden">
        <div className={`h-32 bg-gradient-to-br ${creator.avatar_gradient} relative`}>
          <div className="absolute -bottom-10 left-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-white text-4xl font-extrabold text-violet-700 shadow-lg">
              {creator.full_name.charAt(0)}
            </div>
          </div>
          <div className="absolute right-4 top-4 flex gap-2">
            <AvailabilityBadge availability={creator.availability} />
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 pb-6 pt-14 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {creator.full_name}
              </h1>
              <StarRating rating={creator.rating} count={creator.review_count} />
            </div>
            <p className="mt-1 text-slate-600">{creator.headline}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              {creator.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" /> {creator.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-slate-400" />
                {creator.experience_years} years · {creator.completed_projects} projects
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                responds in ~{creator.response_time_hours}h
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {user?.role === "brand" && (
              <>
                <button
                  onClick={handleShortlist}
                  className={shortlisted ? "btn border border-violet-200 bg-violet-50 text-violet-700" : "btn-secondary"}
                >
                  {shortlisted ? (<><Check className="h-4 w-4" /> Shortlisted</>) : (<><Heart className="h-4 w-4" /> Shortlist</>)}
                </button>
                <button
                  onClick={() => {
                    const err = toggle(creator);
                    if (err) alert(err);
                  }}
                  className={`btn ${selected ? "border border-indigo-200 bg-indigo-50 text-indigo-700" : "btn-secondary"}`}
                >
                  <GitCompareArrows className="h-4 w-4" /> Compare
                </button>
                <button onClick={openInvite} className="btn-primary">
                  <Send className="h-4 w-4" /> Invite to brief
                </button>
              </>
            )}
            {(!user || user.role === "creator") && (
              <button
                onClick={() => {
                  const err = toggle(creator);
                  if (err) alert(err);
                }}
                className="btn-secondary"
              >
                <GitCompareArrows className="h-4 w-4" /> Compare
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: about + portfolio */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">About</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600">
              {creator.bio}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {creator.specialties.map((s) => (
                <span key={s} className="chip !px-3 !py-1">{s}</span>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Portfolio ({creator.portfolio.length})
            </h2>
            {creator.portfolio.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No portfolio items yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {creator.portfolio.map((item: PortfolioItem) => (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 transition hover:shadow-md">
                    <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${item.gradient} text-4xl`}>
                      {item.emoji}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                        <span className="chip-slate shrink-0">{item.category}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {item.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tools_used.map((t) => (
                          <span key={t} className="badge bg-slate-50 text-slate-500">{t}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>


        {/* Right: stats sidebar */}
        <aside className="space-y-6">
          <section className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Price range
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {formatMoney(creator.price_min)} – {formatMoney(creator.price_max)}
            </p>
            <p className="text-xs text-slate-400">per project, negotiable</p>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Experience</span>
                <span className="font-semibold text-slate-800">{creator.experience_years} yrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Projects done</span>
                <span className="font-semibold text-slate-800">{creator.completed_projects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reviews</span>
                <span className="font-semibold text-slate-800">{creator.review_count}</span>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-500" /> Skills
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {creator.skills.length > 0 ? (
                creator.skills.map((s) => <span key={s} className="chip">{s}</span>)
              ) : (
                <span className="text-sm text-slate-400">Not specified</span>
              )}
            </div>
          </section>

          <section className="card p-6">
            <h3 className="text-sm font-bold text-slate-900">AI tools</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {creator.ai_tools.length > 0 ? (
                creator.ai_tools.map((t) => <span key={t} className="chip-slate">{t}</span>)
              ) : (
                <span className="text-sm text-slate-400">Not specified</span>
              )}
            </div>
          </section>

          {user?.role === "brand" && (
            <button onClick={openInvite} className="btn-primary w-full py-3">
              <Send className="h-4 w-4" /> Invite to a brief
            </button>
          )}
        </aside>
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={`Invite ${creator.full_name}`}
      >
        <div className="space-y-4">
          {inviteErr && <ErrorBox message={inviteErr} />}
          {inviteMsg && <SuccessBox message={inviteMsg} />}
          {briefs.length === 0 ? (
            <p className="text-sm text-slate-500">
              You have no published briefs yet.{" "}
              <Link to="/briefs/new" className="font-semibold text-violet-600 underline">
                Create one first
              </Link>
              .
            </p>
          ) : (
            <>
              <div>
                <label className="label">Published brief</label>
                <select
                  className="input"
                  value={briefId}
                  onChange={(e) => setBriefId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Choose a brief…</option>
                  {briefs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} — {formatMoney(b.budget_min)}–{formatMoney(b.budget_max)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Message</label>
                <textarea
                  className="input min-h-[110px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <button
                onClick={sendInvite}
                className="btn-primary w-full"
                disabled={inviteBusy}
              >
                <MessageSquare className="h-4 w-4" />
                {inviteBusy ? "Sending…" : "Send invitation"}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

