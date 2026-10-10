import { Check } from "lucide-react";
import { STATUS_LABELS, WORKFLOW_STEPS, type ProjectStatus } from "../lib/types";

/**
 * Vertical/horizontal stepper rendering the full engagement workflow:
 * Brief Published → Creator Matched → Invitation Sent → Proposal Submitted →
 * In Production → In Review → Revision Requested → Approved → Delivered.
 *
 * Steps before `invitation_sent` (brief published / creator matched) are
 * derived from the project's existence and history events.
 */
export default function StatusStepper({
  status,
  history = [],
}: {
  status: ProjectStatus | string;
  history?: string[];
}) {
  const steps: { key: string; label: string }[] = [
    { key: "brief_published", label: "Brief Published" },
    { key: "creator_matched", label: "Creator Matched" },
    ...WORKFLOW_STEPS.map((s) => ({ key: s, label: STATUS_LABELS[s] })),
  ];

  const seen = new Set<string>(["brief_published", "creator_matched", ...history]);
  // Revision loop: only mark revision step active/seen when relevant.
  const terminalIdx =
    status === "declined"
      ? steps.findIndex((s) => s.key === "invitation_sent")
      : steps.findIndex((s) => s.key === status);
  const currentIdx =
    status === "declined"
      ? terminalIdx
      : Math.max(0, terminalIdx);

  const isDone = (key: string, idx: number) => {
    if (key === "brief_published" || key === "creator_matched") return true;
    if (status === "declined") return idx <= currentIdx;
    if (key === "revision_requested") {
      return status === "revision_requested" || seen.has("revision_requested");
    }
    return idx < currentIdx || seen.has(key);
  };

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-0">
      {steps.map((step, idx) => {
        const done = isDone(step.key, idx);
        const active = step.key === status;
        return (
          <li key={step.key} className="flex flex-1 items-start gap-2 sm:flex-col sm:items-center">
            {/* connector */}
            <div className="flex items-center sm:w-full">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  active
                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white ring-4 ring-violet-100"
                    : done
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done && !active ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              {idx < steps.length - 1 && (
                <span
                  className={`hidden h-0.5 flex-1 sm:block ${
                    isDone(steps[idx + 1].key, idx + 1) ? "bg-violet-300" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-[11px] leading-tight sm:mt-1.5 sm:text-center ${
                active
                  ? "font-bold text-violet-700"
                  : done
                    ? "font-medium text-slate-700"
                    : "font-medium text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
