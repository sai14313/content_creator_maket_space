import { useEffect, useState } from "react";
import { ServerCrash, X } from "lucide-react";
import { API_BASE } from "../lib/api";

type Health = "checking" | "ok" | "error";

/**
 * Startup connectivity check. Pings the backend health endpoint and, if it is
 * unreachable, shows an actionable banner instead of leaving the user with a
 * cryptic "Failed to fetch" in the console.
 *
 * The usual cause in production is a missing/incorrect VITE_API_URL (the app
 * then falls back to http://127.0.0.1:8000, which only works locally) or a
 * backend whose CORS_ORIGINS does not include this site's domain.
 */
export default function BackendStatus() {
  const [health, setHealth] = useState<Health>("checking");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch(`${API_BASE}/api/health`, { signal: controller.signal })
      .then((res) => {
        if (!cancelled) setHealth(res.ok ? "ok" : "error");
      })
      .catch(() => {
        if (!cancelled) setHealth("error");
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (health !== "error" || dismissed) return null;

  // When API_BASE is "" (single-service same-origin deploy) show the actual
  // origin so the user knows exactly where requests are going.
  const effectiveUrl =
    API_BASE || (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1 text-sm text-amber-900">
          <p className="font-semibold">Can't reach the CreatorAI backend</p>
          <p className="mt-1">
            The app is trying to call{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
              {effectiveUrl}
            </code>
            . Logins and data will not load until this is fixed.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            <li>
              If you own this site: confirm the backend is deployed and running,
              then redeploy so the built frontend is served alongside the API.
            </li>
            <li>
              For a split deploy (separate frontend/backend), set the build env
              var <span className="font-mono text-xs">VITE_API_URL</span> to your
              backend's HTTPS URL (no trailing slash) and add this site's domain
              to the backend's <span className="font-mono text-xs">CORS_ORIGINS</span>.
            </li>
            <li>
              Confirm the backend is running: open{" "}
              <span className="font-mono text-xs">{effectiveUrl}/api/health</span>{" "}
              in a new tab.
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-md p-1 text-amber-700 transition hover:bg-amber-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
