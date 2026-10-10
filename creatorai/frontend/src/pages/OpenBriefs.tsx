import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Eye,
  FileText,
  Target,
} from "lucide-react";
import { api } from "../lib/api";
import type { Brief } from "../lib/types";
import Modal from "../components/Modal";
import {
  EmptyState,
  PageLoader,
  StatusBadge,
  formatDate,
  formatMoney,
} from "../components/ui";

/**
 * Creators browse published briefs to understand what brands are hiring for.
 * Per the platform workflow, brands initiate engagement by sending
 * invitations from match results — so this page is informational.
 */
export default function OpenBriefs() {
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [detail, setDetail] = useState<Brief | null>(null);

  const load = useCallback(() => {
    api<Brief[]>("/api/briefs?status=published")
      .then(setBriefs)
      .catch(() => setBriefs([]));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Open briefs
        </h1>
        <p className="mt-1 text-slate-500">
          See what brands are working on. Brands send invitations from match
          results — keep your profile sharp to get picked.
        </p>
      </div>

      {briefs === null ? (
        <PageLoader label="Loading briefs…" />
      ) : briefs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No published briefs"
          description="There are no open briefs right now. Check back soon — new campaigns are published daily."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {briefs.map((b) => (
            <article key={b.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">{b.title}</h2>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{b.objective}</p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5 text-violet-400" />
                  {b.content_type} · {b.preferred_style}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-violet-400" />
                  due {formatDate(b.deadline)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {[...b.required_skills, ...b.required_tools].slice(0, 5).map((t) => (
                  <span key={t} className="chip-slate">{t}</span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm font-bold text-slate-800">
                  {formatMoney(b.budget_min)} – {formatMoney(b.budget_max)}
                </span>
                <button className="btn-secondary h-9" onClick={() => setDetail(b)}>
                  <Eye className="h-4 w-4" /> Details
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ""} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={detail.status} />
              <span className="chip-slate">{detail.content_type}</span>
              <span className="chip-slate">{detail.preferred_style}</span>
            </div>
            <div>
              <p className="label">Objective</p>
              <p className="text-slate-600">{detail.objective || "—"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label">Audience</p>
                <p className="text-slate-600">{detail.audience || "—"}</p>
              </div>
              <div>
                <p className="label">Deadline</p>
                <p className="text-slate-600">{formatDate(detail.deadline)}</p>
              </div>
              <div>
                <p className="label">Budget</p>
                <p className="text-slate-600">
                  {formatMoney(detail.budget_min)} – {formatMoney(detail.budget_max)}
                </p>
              </div>
              <div>
                <p className="label">Usage rights</p>
                <p className="text-slate-600">{detail.usage_rights}</p>
              </div>
            </div>
            <div>
              <p className="label">Deliverables</p>
              <p className="text-slate-600">{detail.deliverables || "—"}</p>
            </div>
            <div>
              <p className="label">Required skills & tools</p>
              <div className="flex flex-wrap gap-1.5">
                {[...detail.required_skills, ...detail.required_tools].map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
