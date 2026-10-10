import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileUp,
  FolderKanban,
  History,
  ListChecks,
  Plus,
  Send,
  Star,
  XCircle,
} from "lucide-react";
import { api, getToken, API_BASE } from "../lib/api";
import type { ProjectDetail as Detail, ProjectStatus } from "../lib/types";
import { STATUS_LABELS } from "../lib/types";
import StatusStepper from "../components/StatusStepper";
import { useAuth } from "../context/AuthContext";
import {
  ErrorBox,
  PageLoader,
  StarRating,
  StatusBadge,
  SuccessBox,
  formatDate,
  formatMoney,
} from "../components/ui";

/** Which transitions each role may trigger (mirrors the backend engine). */
const NEXT: Record<string, { status: ProjectStatus; label: string; roles: string[] }[]> = {
  invitation_sent: [
    { status: "declined", label: "Decline invitation", roles: ["creator"] },
  ],
  proposal_submitted: [
    { status: "in_production", label: "Accept proposal & start", roles: ["brand"] },
    { status: "declined", label: "Reject proposal", roles: ["brand"] },
  ],
  in_production: [
    { status: "in_review", label: "Submit for review", roles: ["creator"] },
  ],
  in_review: [
    { status: "revision_requested", label: "Request revision", roles: ["brand"] },
    { status: "approved", label: "Approve deliverable", roles: ["brand"] },
  ],
  revision_requested: [
    { status: "in_production", label: "Resume production", roles: ["creator"] },
  ],
  approved: [
    { status: "delivered", label: "Mark as delivered", roles: ["brand"] },
  ],
  delivered: [],
  declined: [],
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dlTitle, setDlTitle] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewErr, setReviewErr] = useState("");

  const load = useCallback(() => {
    api<Detail>(`/api/projects/${id}`)
      .then((p) => {
        setProject(p);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  const isCreator = user?.role === "creator";
  const isBrand = user?.role === "brand";

  const changeStatus = async (status: ProjectStatus, label: string) => {
    if (!project) return;
    if (!window.confirm(`${label}?`)) return;
    setBusy(true);
    setActionMsg("");
    setError("");
    try {
      const updated = await api<Detail>(`/api/projects/${project.id}/status`, {
        method: "POST",
        body: { status, note },
      });
      setProject(updated);
      setNote("");
      setActionMsg(`Status → ${STATUS_LABELS[status] ?? status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  };

  const addMilestone = async () => {
    if (!project || msTitle.trim().length < 2) return;
    try {
      await api(`/api/projects/${project.id}/milestones`, {
        method: "POST",
        body: { title: msTitle.trim(), due_date: msDate },
      });
      setMsTitle("");
      setMsDate("");
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not add milestone.");
    }
  };

  const cycleMilestone = async (msId: number, current: string) => {
    const order = ["pending", "in_progress", "completed"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    try {
      await api(`/api/milestones/${msId}`, {
        method: "PATCH",
        body: { status: next },
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const uploadDeliverable = async () => {
    if (!project) return;
    const file = fileRef.current?.files?.[0];
    setUploadErr("");
    setUploadMsg("");
    if (!file) {
      setUploadErr("Choose a file first.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", dlTitle.trim() || file.name);
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/projects/${project.id}/deliverables`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Upload failed (${res.status})`);
      }
      setUploadMsg(`Uploaded "${dlTitle || file.name}" — remember to submit for review.`);
      setDlTitle("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const reviewDeliverable = async (
    dId: number,
    action: "approve" | "request_revision"
  ) => {
    try {
      const notes =
        action === "request_revision"
          ? window.prompt("What should the creator change?") ?? ""
          : "Approved.";
      await api(`/api/deliverables/${dId}/review`, {
        method: "POST",
        body: { action, notes },
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const submitReview = async () => {
    if (!project) return;
    setReviewErr("");
    try {
      await api(`/api/projects/${project.id}/review`, {
        method: "POST",
        body: { rating, comment },
      });
      load();
    } catch (err) {
      setReviewErr(err instanceof Error ? err.message : "Review failed.");
    }
  };


  if (error && !project)
    return (
      <div className="container-page py-16">
        <ErrorBox message={error} />
        <Link to="/projects" className="btn-secondary mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>
      </div>
    );
  if (!project) return <PageLoader label="Loading project…" />;

  const actions = (NEXT[project.status] ?? []).filter((a) =>
    user ? a.roles.includes(user.role) : false
  );
  const history = project.events.map((e) => e.to_status);

  return (
    <div className="container-page py-10">
      <Link to="/projects" className="btn-ghost mb-4 -ml-2 !px-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {project.title}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {project.creator_name} <span className="text-slate-300">×</span>{" "}
              {project.brand_name} · brief:{" "}
              <span className="font-medium text-slate-700">{project.brief_title}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-slate-900">
              {formatMoney(project.agreed_budget)}
            </p>
            <p className="text-xs text-slate-400">
              created {formatDate(project.created_at)}
            </p>
          </div>
        </div>

        {/* Workflow stepper */}
        <div className="mt-6 overflow-x-auto border-t border-slate-100 pt-5">
          <div className="min-w-[720px]">
            <StatusStepper status={project.status} history={history} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}
      {actionMsg && (
        <div className="mt-4">
          <SuccessBox message={actionMsg} />
        </div>
      )}

      {/* Action panel */}
      <section className="card mt-6 p-6">
        <h2 className="text-lg font-bold text-slate-900">Update status</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Available transitions are enforced by the workflow engine — your role
          only sees actions it can perform.
        </p>
        <div className="mt-4">
          <label className="label" htmlFor="note">Note (optional, recorded in history)</label>
          <input
            id="note"
            className="input"
            placeholder="e.g. First cut attached — 60s master ready for review"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No actions available for your role at this stage.
            </p>
          ) : (
            actions.map((a) => (
              <button
                key={a.status}
                disabled={busy}
                onClick={() => changeStatus(a.status, a.label)}
                className={
                  a.status === "declined" || a.status === "revision_requested"
                    ? "btn-danger"
                    : a.status === "in_review"
                      ? "btn-secondary"
                      : "btn-primary"
                }
              >
                {a.status === "declined" ? <XCircle className="h-4 w-4" /> :
                 a.status === "in_production" ? <Send className="h-4 w-4" /> :
                 <CheckCircle2 className="h-4 w-4" />}
                {a.label}
              </button>
            ))
          )}
        </div>
      </section>


      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Milestones */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ListChecks className="h-5 w-5 text-violet-500" /> Milestones
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Click a milestone to cycle pending → in progress → completed.
          </p>

          <div className="mt-4 space-y-2">
            {project.milestones.length === 0 && (
              <p className="text-sm text-slate-500">No milestones yet.</p>
            )}
            {project.milestones.map((m) => (
              <button
                key={m.id}
                onClick={() => cycleMilestone(m.id, m.status)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-violet-300"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold ${
                      m.status === "completed" ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {m.title}
                  </p>
                  {m.due_date && (
                    <p className="text-xs text-slate-400">due {formatDate(m.due_date)}</p>
                  )}
                </div>
                <StatusBadge status={m.status} />
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <input
              className="input flex-1"
              placeholder="New milestone title"
              value={msTitle}
              onChange={(e) => setMsTitle(e.target.value)}
              maxLength={200}
            />
            <input
              type="date"
              className="input !w-40"
              value={msDate}
              onChange={(e) => setMsDate(e.target.value)}
            />
            <button className="btn-primary h-10 !px-3" onClick={addMilestone} title="Add milestone">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Deliverables */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FolderKanban className="h-5 w-5 text-violet-500" /> Deliverables
          </h2>

          {isCreator && (
            <div className="mt-4 space-y-2 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              {uploadErr && <ErrorBox message={uploadErr} />}
              {uploadMsg && <SuccessBox message={uploadMsg} />}
              <input
                className="input"
                placeholder="Deliverable title"
                value={dlTitle}
                onChange={(e) => setDlTitle(e.target.value)}
                maxLength={200}
              />
              <input
                ref={fileRef}
                type="file"
                className="input"
                accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm,.pdf,.txt,.md,.zip,.glb,.psd"
              />
              <button
                className="btn-primary w-full"
                onClick={uploadDeliverable}
                disabled={uploading}
              >
                <FileUp className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload deliverable"}
              </button>
              <p className="text-[11px] text-slate-400">
                Max 25 MB — images, video, PDF, 3D & source files allowed.
              </p>
            </div>
          )}


          <div className="mt-4 space-y-3">
            {project.deliverables.length === 0 && (
              <p className="text-sm text-slate-500">No deliverables uploaded yet.</p>
            )}
            {project.deliverables.map((d) => (
              <article key={d.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{d.title}</p>
                    <p className="text-xs text-slate-400">
                      {d.original_name} · {(d.file_size / 1024).toFixed(1)} KB ·{" "}
                      {formatDate(d.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                {d.notes && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                    {d.notes}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`${API_BASE}/api/files/${encodeURIComponent(d.file_name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary h-8 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  {isBrand && d.status !== "approved" && (
                    <>
                      <button
                        className="btn-primary h-8 text-xs"
                        onClick={() => reviewDeliverable(d.id, "approve")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        className="btn-danger h-8 text-xs"
                        onClick={() => reviewDeliverable(d.id, "request_revision")}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Request revision
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>


      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Review */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Star className="h-5 w-5 text-amber-500" /> Review
          </h2>

          {project.review ? (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4">
              <StarRating rating={project.review.rating} />
              <p className="mt-2 text-sm italic leading-relaxed text-slate-600">
                “{project.review.comment}”
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {formatDate(project.review.created_at)}
              </p>
            </div>
          ) : isBrand && project.status === "delivered" ? (
            <div className="mt-4 space-y-3">
              {reviewErr && <ErrorBox message={reviewErr} />}
              <div>
                <label className="label">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1"
                      title={`${s} star${s > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`h-7 w-7 ${
                          s <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="rcomment">Comment</label>
                <textarea
                  id="rcomment"
                  className="input min-h-[90px]"
                  placeholder="How did the collaboration go?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <button className="btn-primary w-full" onClick={submitReview}>
                Submit review
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {project.status === "delivered"
                ? "Only the brand can leave a review after delivery."
                : "Reviews unlock once the project is delivered."}
            </p>
          )}

          {/* Proposal info */}
          {project.proposals.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-900">Proposal</h3>
              {project.proposals.map((p) => (
                <div key={p.id} className="mt-2 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {formatMoney(p.proposed_budget)} · {p.timeline_days} days
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {p.cover_letter}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Activity history */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <History className="h-5 w-5 text-violet-500" /> Activity history
          </h2>
          <ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">
            {project.events.length === 0 && (
              <li className="text-sm text-slate-500">No events yet.</li>
            )}
            {[...project.events].reverse().map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                    e.to_status === project.status
                      ? "bg-violet-600 ring-4 ring-violet-100"
                      : "bg-slate-300"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {STATUS_LABELS[e.to_status] ?? e.to_status}
                  </span>
                  <span className="badge bg-slate-100 text-slate-500">{e.actor}</span>
                  <span className="text-xs text-slate-400">
                    {formatDate(e.created_at)}
                  </span>
                </div>
                {e.note && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{e.note}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

