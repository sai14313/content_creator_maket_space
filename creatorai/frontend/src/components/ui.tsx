import { Loader2, Star, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* Small building blocks */

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} />;
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="h-8 w-8 text-violet-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="max-w-md text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function SuccessBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {message}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  invitation_sent: "bg-violet-50 text-violet-700 border border-violet-100",
  proposal_submitted: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  in_production: "bg-amber-50 text-amber-700 border border-amber-100",
  in_review: "bg-sky-50 text-sky-700 border border-sky-100",
  revision_requested: "bg-orange-50 text-orange-700 border border-orange-100",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  delivered: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  declined: "bg-slate-100 text-slate-600 border border-slate-200",
  draft: "bg-slate-100 text-slate-600 border border-slate-200",
  published: "bg-violet-50 text-violet-700 border border-violet-100",
  closed: "bg-slate-100 text-slate-500 border border-slate-200",
  sent: "bg-violet-50 text-violet-700 border border-violet-100",
  accepted: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  submitted: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  rejected: "bg-rose-50 text-rose-700 border border-rose-100",
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style =
    STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border border-slate-200";
  const pretty =
    label ??
    status
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  return <span className={`badge ${style}`}>{pretty}</span>;
}

export function AvailabilityBadge({ availability }: { availability: string }) {
  const map: Record<string, { dot: string; text: string; cls: string }> = {
    available: {
      dot: "bg-emerald-500",
      text: "Available",
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    },
    limited: {
      dot: "bg-amber-500",
      text: "Limited",
      cls: "bg-amber-50 text-amber-700 border border-amber-100",
    },
    busy: {
      dot: "bg-rose-500",
      text: "Busy",
      cls: "bg-rose-50 text-rose-700 border border-rose-100",
    },
  };
  const cfg = map[availability] ?? map.busy;
  return (
    <span className={`badge ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.text}
    </span>
  );
}

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  if (!rating) return <span className="text-xs text-slate-400">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className="font-semibold text-slate-800">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-slate-400">({count})</span>}
    </span>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  gradient = "from-violet-500 to-indigo-600",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  gradient?: string;
}) {
  return (
    <div className="card flex items-start gap-4 p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

