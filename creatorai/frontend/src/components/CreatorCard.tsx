import { Link } from "react-router-dom";
import { ArrowUpRight, Briefcase, Check, GitCompareArrows, Heart, MapPin } from "lucide-react";
import type { Creator } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import { AvailabilityBadge, StarRating, formatMoney } from "./ui";

interface Props {
  creator: Creator;
  shortlisted?: boolean;
  onShortlist?: (creator: Creator) => void;
}

export default function CreatorCard({ creator, shortlisted, onShortlist }: Props) {
  const { user } = useAuth();
  const { isSelected, toggle } = useCompare();

  const selected = isSelected(creator.id);

  const handleCompare = () => {
    const err = toggle(creator);
    if (err) alert(err);
  };

  const handleShortlist = () => {
    if (!user || user.role !== "brand") {
      alert("Log in with a brand account to shortlist creators.");
      return;
    }
    onShortlist?.(creator);
  };

  return (
    <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      {/* Gradient header */}
      <div
        className={`relative h-24 bg-gradient-to-br ${creator.avatar_gradient}`}
      >
        <div className="absolute -bottom-8 left-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white text-2xl font-extrabold text-violet-700 shadow-md">
            {creator.full_name.charAt(0)}
          </div>
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          <AvailabilityBadge availability={creator.availability} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-10">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {creator.full_name}
              </h3>
              {creator.company && (
                <p className="text-xs text-slate-400">{creator.company}</p>
              )}
            </div>
            <StarRating rating={creator.rating} count={creator.review_count} />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {creator.headline}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {creator.specialties.slice(0, 2).map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
          {creator.skills
            .filter((s) => !creator.specialties.includes(s))
            .slice(0, 2)
            .map((s) => (
              <span key={s} className="chip-slate">
                {s}
              </span>
            ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {creator.location || "Remote"}
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
            {creator.experience_years} yrs · {creator.completed_projects} projects
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Price range
            </p>
            <p className="text-sm font-bold text-slate-800">
              {formatMoney(creator.price_min)} – {formatMoney(creator.price_max)}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleShortlist}
              className={`btn ${shortlisted ? "border border-violet-200 bg-violet-50 text-violet-700" : "btn-secondary"} h-9 w-9 !px-0`}
              title={shortlisted ? "Shortlisted" : "Add to shortlist"}
              disabled={!user || user.role !== "brand"}
            >
              {shortlisted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleCompare}
              className={`btn ${selected ? "border border-indigo-200 bg-indigo-50 text-indigo-700" : "btn-secondary"} h-9 w-9 !px-0`}
              title="Add to comparison"
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
            <Link to={`/creators/${creator.id}`} className="btn-primary h-9">
              View <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
