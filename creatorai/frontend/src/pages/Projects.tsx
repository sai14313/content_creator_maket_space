import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Search } from "lucide-react";
import { api } from "../lib/api";
import type { Project, ProjectStatus } from "../lib/types";
import {
  EmptyState,
  PageLoader,
  StatusBadge,
  formatDate,
  formatMoney,
} from "../components/ui";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "invitation_sent", label: "Invited" },
  { value: "proposal_submitted", label: "Proposal" },
  { value: "in_production", label: "In production" },
  { value: "in_review", label: "In review" },
  { value: "revision_requested", label: "Revision" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
];

const ACTIVE_STATUSES: ProjectStatus[] = [
  "invitation_sent",
  "proposal_submitted",
  "in_production",
  "in_review",
  "revision_requested",
  "approved",
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    api<Project[]>("/api/projects")
      .then((rows) => {
        setProjects(rows);
        setError("");
      })
      .catch((err) => {
        setError(err.message);
        setProjects([]);
      });
  }, []);

  useEffect(load, [load]);

  if (projects === null) return <PageLoader label="Loading projects…" />;

  const filtered = projects.filter((p) => {
    if (filter === "active" && !ACTIVE_STATUSES.includes(p.status)) return false;
    if (filter && filter !== "active" && p.status !== filter) return false;
    if (q) {
      const needle = q.toLowerCase();
      const hay = `${p.title} ${p.creator_name} ${p.brand_name} ${p.brief_title}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-1 text-slate-500">
            Every engagement from invitation to delivery — tracked end to end.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-9"
            placeholder="Search projects…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filter chips */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={
              filter === f.value
                ? "chip !bg-violet-600 !text-white !border-violet-600 !px-3 !py-1"
                : "chip-slate !px-3 !py-1 hover:border-violet-300"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects here"
            description={
              projects.length === 0
                ? "Projects appear once a creator is invited to one of your briefs (brands) or you accept an invitation (creators)."
                : "No projects match the current filter."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="card group p-5 transition hover:-translate-y-0.5 hover:border-violet-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-900 group-hover:text-violet-700">
                      {p.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {p.creator_name} <span className="text-slate-300">×</span> {p.brand_name}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-bold text-slate-700">
                    {formatMoney(p.agreed_budget)}
                  </span>
                  <span>updated {formatDate(p.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
