import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompareArrows, Heart, Users } from "lucide-react";
import { api } from "../lib/api";
import type { Creator } from "../lib/types";
import CreatorCard from "../components/CreatorCard";
import CompareBar from "../components/CompareBar";
import { EmptyState, PageLoader } from "../components/ui";

export default function Shortlist() {
  const [creators, setCreators] = useState<Creator[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<{ creator: Creator }[]>("/api/shortlists")
      .then((rows) => {
        setCreators(rows.map((r) => r.creator));
        setError("");
      })
      .catch((err) => {
        setError(err.message);
        setCreators([]);
      });
  }, []);

  useEffect(load, [load]);

  const remove = async (creator: Creator) => {
    try {
      await api<void>(`/api/shortlists/${creator.id}`, { method: "DELETE" });
      setCreators((prev) => prev?.filter((c) => c.id !== creator.id) ?? prev);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Remove failed.");
    }
  };

  if (creators === null) return <PageLoader label="Loading shortlist…" />;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Shortlist
          </h1>
          <p className="mt-1 text-slate-500">
            Creators you've saved — compare them or invite them to a brief.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/compare" className="btn-secondary">
            <GitCompareArrows className="h-4 w-4" /> Compare
          </Link>
          <Link to="/discover" className="btn-primary">
            <Users className="h-4 w-4" /> Discover more
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {creators.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your shortlist is empty"
            description="Heart creators in the marketplace to save them here for later comparison and invitations."
            action={
              <Link to="/discover" className="btn-primary">
                Browse creators
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c) => (
              <CreatorCard
                key={c.id}
                creator={c}
                shortlisted
                onShortlist={remove}
              />
            ))}
          </div>
        )}
      </div>

      <CompareBar />
    </div>
  );
}
