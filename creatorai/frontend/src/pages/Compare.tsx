import { Link } from "react-router-dom";
import { GitCompareArrows, MapPin, Trash2, Users } from "lucide-react";
import { useCompare } from "../context/CompareContext";
import { useAuth } from "../context/AuthContext";
import {
  AvailabilityBadge,
  EmptyState,
  StarRating,
  formatMoney,
} from "../components/ui";

export default function Compare() {
  const { creators, remove, clear } = useCompare();
  const { user } = useAuth();

  if (creators.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={Users}
          title="Nothing to compare yet"
          description="Pick up to three creators from the marketplace or match results using the compare button."
          action={
            <Link to="/discover" className="btn-primary">
              Browse creators
            </Link>
          }
        />
      </div>
    );
  }

  const rows = [
    { label: "Headline", render: (c: (typeof creators)[number]) => c.headline },
    {
      label: "Location",
      render: (c: (typeof creators)[number]) => (
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {c.location || "Remote"}
        </span>
      ),
    },
    {
      label: "Specialties",
      render: (c: (typeof creators)[number]) => (
        <span className="flex flex-wrap gap-1">
          {c.specialties.map((s) => (
            <span key={s} className="chip">{s}</span>
          ))}
        </span>
      ),
    },
    {
      label: "Skills",
      render: (c: (typeof creators)[number]) => (
        <span className="flex flex-wrap gap-1">
          {c.skills.map((s) => (
            <span key={s} className="chip-slate">{s}</span>
          ))}
        </span>
      ),
    },
    {
      label: "AI tools",
      render: (c: (typeof creators)[number]) => (
        <span className="flex flex-wrap gap-1">
          {c.ai_tools.map((t) => (
            <span key={t} className="chip-slate">{t}</span>
          ))}
        </span>
      ),
    },
    {
      label: "Price range",
      render: (c: (typeof creators)[number]) => (
        <span className="font-bold text-slate-800">
          {formatMoney(c.price_min)} – {formatMoney(c.price_max)}
        </span>
      ),
    },
    {
      label: "Availability",
      render: (c: (typeof creators)[number]) => (
        <AvailabilityBadge availability={c.availability} />
      ),
    },
    {
      label: "Rating",
      render: (c: (typeof creators)[number]) => (
        <StarRating rating={c.rating} count={c.review_count} />
      ),
    },
    { label: "Experience", render: (c: (typeof creators)[number]) => `${c.experience_years} years` },
    { label: "Projects done", render: (c: (typeof creators)[number]) => String(c.completed_projects) },
    { label: "Response time", render: (c: (typeof creators)[number]) => `~${c.response_time_hours}h` },
    { label: "Portfolio pieces", render: (c: (typeof creators)[number]) => String(c.portfolio.length) },
  ];

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Compare creators
          </h1>
          <p className="mt-1 text-slate-500">
            Side-by-side view of your shortlist — up to three creators.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={clear}>
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
          <Link to="/discover" className="btn-primary">
            <GitCompareArrows className="h-4 w-4" /> Add more
          </Link>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="w-40 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                Creator
              </th>
              {creators.map((c) => (
                <th key={c.id} className="px-5 py-4 text-left align-top">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.avatar_gradient} text-lg font-extrabold text-white`}
                    >
                      {c.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/creators/${c.id}`}
                        className="block font-bold text-slate-900 hover:text-violet-700"
                      >
                        {c.full_name}
                      </Link>
                      <button
                        onClick={() => remove(c.id)}
                        className="mt-0.5 text-xs font-medium text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>


          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {row.label}
                </td>
                {creators.map((c) => (
                  <td key={c.id} className="px-5 py-3 align-top text-slate-700">
                    {row.render(c)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50/60">
              <td className="px-5 py-4" />
              {creators.map((c) => (
                <td key={c.id} className="px-5 py-4">
                  <Link to={`/creators/${c.id}`} className="btn-primary h-9 w-full">
                    View profile
                  </Link>
                  {user?.role === "brand" && (
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      Shortlist & invite from their profile
                    </p>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {creators.length < 2 && (
        <p className="mt-4 text-center text-sm text-slate-400">
          Add at least two creators for a meaningful comparison.
        </p>
      )}
    </div>
  );
}

