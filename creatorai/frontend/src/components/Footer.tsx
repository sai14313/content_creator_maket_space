import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { API_BASE } from "../lib/api";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
              <Rocket className="h-4 w-4" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              Creator<span className="text-violet-600">AI</span>
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            The marketplace where brands and AI creators meet — discover talent,
            publish creative briefs, and review explainable match scores.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Built for HacXLerate 2026. Matching is a transparent scoring engine,
            not a trained ML model.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="mb-3 font-semibold text-slate-800">Product</p>
            <ul className="space-y-2 text-slate-500">
              <li><Link className="hover:text-violet-600" to="/discover">Creator marketplace</Link></li>
              <li><Link className="hover:text-violet-600" to="/briefs/new">Publish a brief</Link></li>
              <li><Link className="hover:text-violet-600" to="/compare">Compare creators</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-800">Demo</p>
            <ul className="space-y-2 text-slate-500">
              <li><Link className="hover:text-violet-600" to="/login">Brand login</Link></li>
              <li><Link className="hover:text-violet-600" to="/register">Create account</Link></li>
              <li><a className="hover:text-violet-600" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">API docs</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4">
        <p className="container-page text-center text-xs text-slate-400">
          © 2026 CreatorAI — demo data is fictional. All creators and brands shown are samples.
        </p>
      </div>
    </footer>
  );
}
