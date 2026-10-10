import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  Plus,
  Sparkles,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import type { Brief } from "../lib/types";
import {
  EmptyState,
  PageLoader,
  StatusBadge,
  formatMoney,
} from "../components/ui";

export default function MyBriefs() {
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    api<Brief[]>("/api/briefs?mine=true")
      .then((rows) => {
        setBriefs(rows);
        setError("");
      })
      .catch((err) => {
        setError(err.message);
        setBriefs([]);
      });
  }, []);

  useEffect(load, [load]);

  const setStatus = async (brief: Brief, status: Brief["status"]) => {
    setBusyId(brief.id);
    try {
      await api<Brief>(`/api/briefs/${brief.id}`, {
        method: "PATCH",
        body: { status },
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (brief: Brief) => {
    if (!window.confirm(`Delete "${brief.title}"? This cannot be undone.`)) return;
    setBusyId(brief.id);
    try {
      await api<void>(`/api/briefs/${brief.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };


  if (briefs === null) return <PageLoader label="Loading your briefs…" />;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My briefs
          </h1>
          <p className="mt-1 text-slate-500">
            Publish briefs to invite creators and run AI matching.
          </p>
        </div>
        <Link to="/briefs/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New brief
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {briefs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No briefs yet"
            description="Create your first creative brief — you can generate one from a single idea with the AI assistant."
            action={
              <Link to="/briefs/new" className="btn-primary">
                <Plus className="h-4 w-4" /> Create brief
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {briefs.map((b) => (
              <article key={b.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{b.title}</h2>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {b.objective || "No objective set."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-violet-400" />
                        {b.content_type} · {b.preferred_style}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
                        due {b.deadline || "—"}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatMoney(b.budget_min)} – {formatMoney(b.budget_max)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {[...b.required_skills, ...b.required_tools].slice(0, 6).map((t) => (
                        <span key={t} className="chip-slate">{t}</span>
                      ))}
                    </div>
                  </div>


                  <div className="flex flex-wrap gap-2">
                    {b.status !== "draft" && (
                      <Link to={`/briefs/${b.id}/matches`} className="btn-primary h-9">
                        <Sparkles className="h-4 w-4" /> Matches
                      </Link>
                    )}
                    {b.status === "draft" && (
                      <button
                        className="btn-secondary h-9"
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b, "published")}
                      >
                        Publish
                      </button>
                    )}
                    {b.status === "published" && (
                      <button
                        className="btn-secondary h-9"
                        disabled={busyId === b.id}
                        onClick={() => setStatus(b, "closed")}
                      >
                        <XCircle className="h-4 w-4" /> Close
                      </button>
                    )}
                    {b.status === "draft" && (
                      <button
                        className="btn-danger h-9"
                        disabled={busyId === b.id}
                        onClick={() => remove(b)}
                        title="Delete draft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

