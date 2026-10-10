import { Link } from "react-router-dom";
import { GitCompareArrows, Trash2 } from "lucide-react";
import { useCompare } from "../context/CompareContext";

/**
 * Floating bar shown when 1–3 creators are selected for comparison.
 */
export default function CompareBar() {
  const { creators, remove, clear } = useCompare();
  if (creators.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(720px,94vw)] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
        <GitCompareArrows className="h-5 w-5 shrink-0 text-violet-600" />
        <div className="flex flex-1 flex-wrap gap-1.5">
          {creators.map((c) => (
            <span key={c.id} className="chip">
              {c.full_name.split(" ")[0]}
              <button
                onClick={() => remove(c.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-violet-200"
                title={`Remove ${c.full_name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
          {Array.from({ length: 3 - creators.length }).map((_, i) => (
            <span key={`ph-${i}`} className="chip !border-dashed !bg-transparent !text-slate-300">
              empty
            </span>
          ))}
        </div>
        <button onClick={clear} className="btn-ghost h-8 text-xs">
          Clear
        </button>
        <Link
          to="/compare"
          className={`btn-primary h-9 ${creators.length < 2 ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={creators.length < 2}
        >
          Compare {creators.length > 1 ? `(${creators.length})` : ""}
        </Link>
      </div>
    </div>
  );
}
