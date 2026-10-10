import { useCallback, useEffect, useMemo, useState } from "react";
import { GitCompareArrows, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Creator } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useCompare } from "../context/CompareContext";
import CreatorCard from "../components/CreatorCard";
import CompareBar from "../components/CompareBar";
import { EmptyState, PageLoader } from "../components/ui";

const SPECIALTIES = [
  "AI filmmaking",
  "AI animation",
  "AI-generated images",
  "AI product advertisements",
  "AI storytelling",
  "Generative 3D design",
];

const SORTS = [
  { value: "rating", label: "Top rated" },
  { value: "experience", label: "Most experienced" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
];

export default function Marketplace() {
  const { user } = useAuth();
  const { creators: compareList } = useCompare();
  const [creators, setCreators] = useState<Creator[] | null>(null);
  const [shortlistIds, setShortlistIds] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [availability, setAvailability] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (specialty) params.set("specialty", specialty);
      if (availability) params.set("availability", availability);
      if (maxPrice) params.set("max_price", maxPrice);
      params.set("sort", sort);
      const data = await api<Creator[]>(`/api/creators?${params.toString()}`);
      setCreators(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load creators.");
      setCreators([]);
    }
  }, [q, specialty, availability, maxPrice, sort]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Load shortlist ids (brands only)
  useEffect(() => {
    if (user?.role !== "brand") return;
    api<{ creator: Creator }[]>("/api/shortlists")
      .then((rows) => setShortlistIds(new Set(rows.map((r) => r.creator.id))))
      .catch(() => undefined);
  }, [user]);

  const toggleShortlist = async (creator: Creator) => {
    try {
      if (shortlistIds.has(creator.id)) {
        await api<void>(`/api/shortlists/${creator.id}`, { method: "DELETE" });
        setShortlistIds((prev) => {
          const next = new Set(prev);
          next.delete(creator.id);
          return next;
        });
      } else {
        await api("/api/shortlists", {
          method: "POST",
          body: { creator_id: creator.id },
        });
        setShortlistIds((prev) => new Set(prev).add(creator.id));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update shortlist.");
    }
  };

  const hasFilters = Boolean(q || specialty || availability || maxPrice);
  const clearFilters = () => {
    setQ("");
    setSpecialty("");
    setAvailability("");
    setMaxPrice("");
    setSort("rating");
  };


  const comparing = useMemo(() => compareList.length > 0, [compareList]);

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Creator marketplace
          </h1>
          <p className="mt-1 text-slate-500">
            Discover AI creators by skills, tools, budget and availability.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary md:hidden" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <Link to="/compare" className="btn-secondary">
            <GitCompareArrows className="h-4 w-4" />
            Compare ({compareList.length}/3)
          </Link>
        </div>
      </div>

      {/* Search + filters */}
      <div className="card mt-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input !pl-9"
              placeholder="Search by name, skill or tool — e.g. Runway, animation"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="input md:w-48" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} mt-3 gap-3 md:grid md:grid-cols-3`}>
          <select className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            <option value="">All specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="input" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="">Any availability</option>
            <option value="available">Available now</option>
            <option value="limited">Limited</option>
            <option value="busy">Busy</option>
          </select>
          <select className="input" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">Any budget</option>
            <option value="2000">Up to ₹2,000</option>
            <option value="5000">Up to ₹5,000</option>
            <option value="10000">Up to ₹10,000</option>
            <option value="15000">Up to ₹15,000</option>
          </select>
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">
              {creators ? `${creators.length} creator(s) match` : "Searching…"}
            </span>
            <button className="btn-ghost h-8 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          </div>
        )}
      </div>


      {/* Results */}
      <div className="mt-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {creators === null ? (
          <PageLoader label="Loading creators…" />
        ) : creators.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No creators match"
            description="Try a different search term or clear the active filters."
            action={
              <button onClick={clearFilters} className="btn-primary">
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c) => (
              <CreatorCard
                key={c.id}
                creator={c}
                shortlisted={shortlistIds.has(c.id)}
                onShortlist={toggleShortlist}
              />
            ))}
          </div>
        )}
      </div>

      {comparing && <CompareBar />}
    </div>
  );
}

