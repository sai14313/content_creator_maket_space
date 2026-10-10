import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Rocket, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ErrorBox } from "../components/ui";

const DEMO_ACCOUNTS = [
  {
    label: "Brand demo",
    email: "demo@novamedia.test",
    desc: "Nova Media — briefs, matches, projects",
  },
  {
    label: "Creator demo",
    email: "aria@creatorai.test",
    desc: "Aria Chen — invitations, proposals, uploads",
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectFor = (role: string) => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from) return from;
    return role === "brand" ? "/brand" : "/creator";
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(redirectFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo12345");
    setError("");
  };

  return (
    <div className="hero-gradient flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
              <Rocket className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Log in to your CreatorAI account
            </p>
          </div>

          {error && <div className="mb-4"><ErrorBox message={error} /></div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? "Logging in…" : (<><LogIn className="h-4 w-4" /> Log in</>)}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5" /> Demo accounts (password: demo12345)
            </p>
            <div className="mt-2 space-y-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => useDemo(d.email)}
                  className="w-full rounded-lg border border-white bg-white px-3 py-2 text-left shadow-sm transition hover:border-violet-300"
                >
                  <span className="text-xs font-bold text-slate-800">{d.label}</span>
                  <span className="block truncate text-xs text-slate-500">{d.email}</span>
                  <span className="block text-[11px] text-slate-400">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            New here?{" "}
            <Link to="/register" className="font-semibold text-violet-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
