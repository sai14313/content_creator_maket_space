import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, UserRound, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ErrorBox } from "../components/ui";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    company: "",
    role: "brand" as "brand" | "creator",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const user = await register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        company: form.role === "brand" ? form.company : undefined,
      });
      navigate(user.role === "brand" ? "/brand" : "/creator", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hero-gradient flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Join the AI content marketplace — it takes under a minute.
            </p>
          </div>

          {error && <div className="mb-4"><ErrorBox message={error} /></div>}

          {/* Role selector */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            {(
              [
                { value: "brand", label: "I'm a brand", icon: Building2, desc: "Hire AI creators" },
                { value: "creator", label: "I'm a creator", icon: UserRound, desc: "Get hired" },
              ] as const
            ).map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => set("role", r.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  form.role === r.value
                    ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100"
                    : "border-slate-200 bg-white hover:border-violet-200"
                }`}
              >
                <r.icon
                  className={`h-5 w-5 ${form.role === r.value ? "text-violet-600" : "text-slate-400"}`}
                />
                <p className="mt-1.5 text-sm font-bold text-slate-800">{r.label}</p>
                <p className="text-[11px] text-slate-400">{r.desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input
                id="name" required className="input" placeholder="Alex Rivera"
                value={form.full_name} onChange={(e) => set("full_name", e.target.value)}
              />
            </div>
            {form.role === "brand" && (
              <div>
                <label className="label" htmlFor="company">Company</label>
                <input
                  id="company" className="input" placeholder="Acme Inc. (optional)"
                  value={form.company} onChange={(e) => set("company", e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="remail">Email</label>
              <input
                id="remail" type="email" required className="input" placeholder="you@company.com"
                value={form.email} onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="rpassword">Password</label>
              <input
                id="rpassword" type="password" required minLength={8} className="input"
                placeholder="At least 8 characters"
                value={form.password} onChange={(e) => set("password", e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? "Creating account…" : (<><UserPlus className="h-4 w-4" /> Sign up</>)}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-violet-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
