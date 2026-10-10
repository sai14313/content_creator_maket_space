import { Link } from "react-router-dom";
import { Compass, CompassIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <CompassIcon className="h-16 w-16 text-violet-300" />
      <h1 className="mt-4 text-4xl font-extrabold text-slate-900">404</h1>
      <p className="mt-2 text-slate-500">This page doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6">
        <Compass className="h-4 w-4" /> Back home
      </Link>
    </div>
  );
}
