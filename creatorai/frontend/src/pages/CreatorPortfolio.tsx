import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";
import type { Creator, PortfolioItem } from "../lib/types";
import { ErrorBox, PageLoader, SuccessBox, formatMoney } from "../components/ui";

const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-fuchsia-500 to-purple-600",
  "from-indigo-500 to-blue-600",
  "from-purple-500 to-pink-500",
  "from-teal-500 to-indigo-600",
  "from-orange-500 to-rose-500",
  "from-sky-500 to-violet-600",
  "from-emerald-500 to-teal-600",
];

const EMOJIS = ["🎬", "🎨", "🖼️", "🚀", "📦", "✨", "🧊", "🎭", "🧪", "🎠"];

const SKILL_OPTIONS = [
  "AI filmmaking",
  "AI animation",
  "AI-generated images",
  "AI product advertisements",
  "AI storytelling",
  "Generative 3D design",
  "Prompt engineering",
  "Storyboarding",
  "Video editing",
  "Color grading",
  "Character design",
  "Motion design",
];

const TOOL_OPTIONS = [
  "Midjourney", "Stable Diffusion", "Runway", "Pika", "Sora", "DALL·E",
  "Blender", "Luma", "Kling", "ElevenLabs", "Adobe Firefly", "Cinema 4D",
];

interface ProfileForm {
  headline: string;
  bio: string;
  location: string;
  specialties: string[];
  skills: string[];
  ai_tools: string[];
  price_min: string;
  price_max: string;
  availability: string;
  experience_years: string;
}

export default function CreatorPortfolio() {
  const [profile, setProfile] = useState<Creator | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  // New portfolio item form
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    category: "AI film",
    tools: "",
    tags: "",
    gradient: GRADIENTS[0],
    emoji: EMOJIS[0],
  });
  const [itemErr, setItemErr] = useState("");

  const load = useCallback(() => {
    api<Creator>("/api/creators/me/profile")
      .then((p) => {
        setProfile(p);
        setForm({
          headline: p.headline,
          bio: p.bio,
          location: p.location,
          specialties: p.specialties,
          skills: p.skills,
          ai_tools: p.ai_tools,
          price_min: String(p.price_min),
          price_max: String(p.price_max),
          availability: p.availability,
          experience_years: String(p.experience_years),
        });
        setItems(p.portfolio);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const toggle = (k: "skills" | "ai_tools" | "specialties", v: string) => {
    setForm((f) => {
      if (!f) return f;
      const list = f[k];
      return {
        ...f,
        [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v],
      };
    });
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError("");
    setSaved("");
    if (Number(form.price_max) < Number(form.price_min)) {
      setError("Maximum price must be >= minimum price.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/creators/me/profile", {
        method: "PUT",
        body: {
          headline: form.headline,
          bio: form.bio,
          location: form.location,
          specialties: form.specialties,
          skills: form.skills,
          ai_tools: form.ai_tools,
          price_min: Number(form.price_min),
          price_max: Number(form.price_max),
          availability: form.availability,
          experience_years: Number(form.experience_years),
        },
      });
      setSaved("Profile updated — match scores will reflect your new data.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const addItem = async () => {
    setItemErr("");
    if (newItem.title.trim().length < 2) {
      setItemErr("Title is required.");
      return;
    }
    try {
      const created = await api<PortfolioItem>("/api/creators/me/portfolio", {
        method: "POST",
        body: {
          title: newItem.title.trim(),
          description: newItem.description.trim(),
          category: newItem.category,
          tools_used: newItem.tools.split(",").map((t) => t.trim()).filter(Boolean),
          style_tags: newItem.tags.split(",").map((t) => t.trim()).filter(Boolean),
          gradient: newItem.gradient,
          emoji: newItem.emoji,
        },
      });
      setItems((prev) => [...prev, created]);
      setShowAdd(false);
      setNewItem({ ...newItem, title: "", description: "", tools: "", tags: "" });
    } catch (err) {
      setItemErr(err instanceof Error ? err.message : "Could not add item.");
    }
  };

  const deleteItem = async (item: PortfolioItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await api<void>(`/api/creators/me/portfolio/${item.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  if (!profile || !form) return <PageLoader label="Loading your profile…" />;

  return (
    <div className="container-page py-10">
      <Link to="/creator" className="btn-ghost mb-4 -ml-2 !px-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Profile & portfolio
        </h1>
        <p className="mt-1 text-slate-500">
          Your profile data directly powers the AI match scores brands see.
        </p>
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}
      {saved && <div className="mb-4"><SuccessBox message={saved} /></div>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile form */}
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-slate-900">Profile details</h2>

          <div>
            <label className="label" htmlFor="headline">Headline</label>
            <input
              id="headline" className="input" maxLength={200}
              placeholder="AI filmmaker crafting cinematic brand stories"
              value={form.headline} onChange={(e) => set("headline", e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea
              id="bio" className="input min-h-[120px]" maxLength={4000}
              value={form.bio} onChange={(e) => set("bio", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="loc">Location</label>
              <input
                id="loc" className="input" value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="avail">Availability</label>
              <select
                id="avail" className="input" value={form.availability}
                onChange={(e) => set("availability", e.target.value)}
              >
                <option value="available">Available now</option>
                <option value="limited">Limited</option>
                <option value="busy">Busy</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="pmin">Price min ($)</label>
              <input
                id="pmin" type="number" min={0} className="input"
                value={form.price_min} onChange={(e) => set("price_min", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="pmax">Price max ($)</label>
              <input
                id="pmax" type="number" min={0} className="input"
                value={form.price_max} onChange={(e) => set("price_max", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="exp">Experience (yrs)</label>
              <input
                id="exp" type="number" min={0} max={60} className="input"
                value={form.experience_years}
                onChange={(e) => set("experience_years", e.target.value)}
              />
            </div>
          </div>


          <div>
            <label className="label">Specialties (drive discovery & 30% skill match)</label>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_OPTIONS.slice(0, 6).map((s) => (
                <button
                  key={s} type="button" onClick={() => toggle("specialties", s)}
                  className={
                    form.specialties.includes(s)
                      ? "chip !bg-violet-600 !text-white !border-violet-600"
                      : "chip-slate hover:border-violet-300"
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Skills</label>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_OPTIONS.map((s) => (
                <button
                  key={s} type="button" onClick={() => toggle("skills", s)}
                  className={
                    form.skills.includes(s)
                      ? "chip !bg-violet-600 !text-white !border-violet-600"
                      : "chip-slate hover:border-violet-300"
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">AI tools</label>
            <div className="flex flex-wrap gap-1.5">
              {TOOL_OPTIONS.map((t) => (
                <button
                  key={t} type="button" onClick={() => toggle("ai_tools", t)}
                  className={
                    form.ai_tools.includes(t)
                      ? "chip !bg-indigo-600 !text-white !border-indigo-600"
                      : "chip-slate hover:border-indigo-300"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>


        {/* Portfolio manager */}
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Portfolio ({items.length})
            </h2>
            <button className="btn-primary h-9" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>

          {showAdd && (
            <div className="mt-4 space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              {itemErr && <ErrorBox message={itemErr} />}
              <input
                className="input" placeholder="Title *"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
              <textarea
                className="input min-h-[70px]" placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="input" value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  {SKILL_OPTIONS.slice(0, 6).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  className="input" placeholder="Tools (comma separated)"
                  value={newItem.tools}
                  onChange={(e) => setNewItem({ ...newItem, tools: e.target.value })}
                />
              </div>
              <input
                className="input" placeholder="Style tags (comma separated, e.g. Cinematic, Editorial)"
                value={newItem.tags}
                onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Color:</span>
                {GRADIENTS.map((g) => (
                  <button
                    key={g} type="button"
                    onClick={() => setNewItem({ ...newItem, gradient: g })}
                    className={`h-6 w-6 rounded-full bg-gradient-to-br ${g} ${
                      newItem.gradient === g ? "ring-2 ring-slate-800 ring-offset-1" : ""
                    }`}
                    title={g}
                  />
                ))}
                <span className="ml-2 text-xs font-medium text-slate-500">Icon:</span>
                {EMOJIS.map((em) => (
                  <button
                    key={em} type="button"
                    onClick={() => setNewItem({ ...newItem, emoji: em })}
                    className={`h-7 w-7 rounded-lg text-sm ${
                      newItem.emoji === em ? "bg-violet-100 ring-2 ring-violet-400" : "bg-white"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="btn-primary h-9 flex-1" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Add to portfolio
                </button>
                <button className="btn-ghost h-9" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {items.length === 0 && !showAdd && (
              <p className="text-sm text-slate-500">
                No portfolio items yet. Strong portfolios raise your portfolio &
                style relevance score (25% of matching).
              </p>
            )}
            {items.map((item) => (
              <article key={item.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-2xl`}
                >
                  {item.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <button
                      className="btn-ghost h-7 w-7 !px-0 text-rose-500"
                      onClick={() => deleteItem(item)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="line-clamp-1 text-xs text-slate-500">{item.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="chip-slate">{item.category}</span>
                    {item.tools_used.slice(0, 3).map((t) => (
                      <span key={t} className="badge bg-slate-50 text-slate-500">{t}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-4 flex gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] italic text-slate-500">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
            Tip: use style tags (Cinematic, Editorial…) and real tools so the
            matching engine can connect your work to brand briefs.
          </p>
        </section>
      </div>
    </div>
  );
}

