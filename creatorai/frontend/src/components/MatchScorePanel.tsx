import { Info } from "lucide-react";
import type { MatchResult } from "../lib/types";

/**
 * Renders the explainable score: circular score badge + per-component
 * weighted breakdown bars with plain-English reasons.
 */
export default function MatchScorePanel({
  match,
  weights,
}: {
  match: MatchResult;
  weights?: Record<string, string>;
}) {
  const score = match.match_score;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringColor =
    score >= 85
      ? "#059669"
      : score >= 72
        ? "#7c3aed"
        : score >= 60
          ? "#2563eb"
          : "#f59e0b";

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-indigo-50/60 p-5">
      <div className="flex items-center gap-5">
        {/* Score ring */}
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
            <circle
              cx="40" cy="40" r={radius}
              fill="none" stroke="#e2e8f0" strokeWidth="8"
            />
            <circle
              cx="40" cy="40" r={radius}
              fill="none" stroke={ringColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-slate-900">
              {Math.round(score)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Match
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <span className="badge bg-white text-violet-700 shadow-sm">
            {match.tier}
          </span>
          <ul className="mt-2 space-y-1">
            {match.reasons.slice(0, 3).map((r, i) => (
              <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-slate-600">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="mt-4 space-y-3 border-t border-violet-100 pt-4">
        {match.components.map((c) => (
          <div key={c.key}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">
                {c.label}
                {weights?.[c.key] && (
                  <span className="ml-1 font-normal text-slate-400">
                    · weight {weights[c.key]}
                  </span>
                )}
              </span>
              <span className="font-bold text-slate-800">
                {c.earned_points.toFixed(1)}
                <span className="font-normal text-slate-400">/{c.max_points}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className={`h-full rounded-full ${
                  c.score >= 75
                    ? "bg-emerald-500"
                    : c.score >= 50
                      ? "bg-violet-500"
                      : "bg-amber-500"
                }`}
                style={{ width: `${c.score}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {c.explanation}
            </p>
          </div>
        ))}
        <p className="flex gap-1.5 rounded-lg bg-white/70 px-3 py-2 text-[11px] italic text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
          Scores come from a transparent weighted scoring engine over real profile
          data — not a trained ML model. Every point is traceable to the
          explanations above.
        </p>
      </div>
    </div>
  );
}
