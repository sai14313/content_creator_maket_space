import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Sparkles,
  Wand2,
} from "lucide-react";
import { api } from "../lib/api";
import type { Brief } from "../lib/types";
import { ErrorBox } from "../components/ui";

const CONTENT_TYPES = [
  "AI film",
  "AI animation",
  "AI-generated images",
  "AI product advertisement",
  "AI storytelling",
  "Generative 3D design",
];

const STYLES = [
  "Cinematic",
  "Minimalist",
  "Playful & vibrant",
  "Dark & moody",
  "Editorial",
  "Photorealistic",
  "Hand-drawn 2D",
  "Retro-futuristic",
];

const SKILLS = [
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

const TOOLS = [
  "Midjourney",
  "Stable Diffusion",
  "Runway",
  "Pika",
  "Sora",
  "DALL·E",
  "Blender",
  "Luma",
  "Kling",
  "ElevenLabs",
  "Adobe Firefly",
  "Cinema 4D",
];

const USAGE_RIGHTS = [
  "3-month organic social",
  "12-month digital ads",
  "Perpetual worldwide",
  "Editorial / organic only",
];

interface BriefForm {
  title: string;
  objective: string;
  audience: string;
  content_type: string;
  preferred_style: string;
  required_skills: string[];
  required_tools: string[];
  budget_min: string;
  budget_max: string;
  deadline: string;
  deliverables: string;
  usage_rights: string;
}

const EMPTY: BriefForm = {
  title: "",
  objective: "",
  audience: "",
  content_type: "AI film",
  preferred_style: "Cinematic",
  required_skills: [],
  required_tools: [],
  budget_min: "1000",
  budget_max: "5000",
  deadline: "",
  deliverables: "",
  usage_rights: "3-month organic social",
};

export default function BriefCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState<BriefForm>(EMPTY);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [idea, setIdea] = useState("");
  const [error, setError] = useState("");
  const [genError, setGenError] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [genDone, setGenDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof BriefForm>(k: K, v: BriefForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleIn = (key: "required_skills" | "required_tools", value: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));
  };

  /* ---- Generate Brief (local template engine, LLM-ready) ---- */
  const generate = async () => {
    if (idea.trim().length < 10) {
      setGenError("Describe your idea in at least 10 characters.");
      return;
    }
    setGenBusy(true);
    setGenError("");
    setGenDone(false);
    try {
      const b = await api<Brief>("/api/briefs/generate", {
        method: "POST",
        body: { idea },
      });
      setForm({
        title: b.title,
        objective: b.objective,
        audience: b.audience,
        content_type: b.content_type,
        preferred_style: b.preferred_style,
        required_skills: b.required_skills,
        required_tools: b.required_tools,
        budget_min: String(b.budget_min),
        budget_max: String(b.budget_max),
        deadline: b.deadline,
        deliverables: b.deliverables,
        usage_rights: b.usage_rights,
      });
      setGenDone(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Brief generation failed.");
    } finally {
      setGenBusy(false);
    }
  };

  /* ---- Save ---- */
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || form.title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (Number(form.budget_max) < Number(form.budget_min)) {
      setError("Maximum budget must be greater than or equal to the minimum.");
      return;
    }
    if (!form.deadline) {
      setError("Pick a deadline.");
      return;
    }

    setBusy(true);
    try {
      const brief = await api<Brief>("/api/briefs", {
        method: "POST",
        body: {
          title: form.title.trim(),
          objective: form.objective.trim(),
          audience: form.audience.trim(),
          content_type: form.content_type,
          preferred_style: form.preferred_style,
          required_skills: form.required_skills,
          required_tools: form.required_tools,
          budget_min: Number(form.budget_min),
          budget_max: Number(form.budget_max),
          deadline: form.deadline,
          deliverables: form.deliverables.trim(),
          usage_rights: form.usage_rights,
          status,
        },
      });
      if (status === "published") {
        navigate(`/briefs/${brief.id}/matches`);
      } else {
        navigate("/briefs");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the brief.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-10">
      <Link to="/briefs" className="btn-ghost mb-4 -ml-2 !px-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> My briefs
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Create a creative brief
        </h1>
        <p className="mt-1 text-slate-500">
          Describe your campaign, then let creators find you — or generate a
          structured brief from a single idea.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: AI generator + tips */}
        <aside className="space-y-6 lg:col-span-1">
          <section className="card border-violet-100 p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                <Wand2 className="h-4 w-4" />
              </span>
              Generate brief from an idea
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Write one sentence. Our template engine structures it into a full
              brief (audience, style, deliverables, budget) — architecture is
              ready for optional LLM integration.
            </p>
            <textarea
              className="input mt-4 min-h-[96px]"
              placeholder="e.g. A cinematic launch film for our new electric scooter brand"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              maxLength={600}
            />
            {genError && <div className="mt-3"><ErrorBox message={genError} /></div>}
            {genDone && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                Brief generated — review the filled fields and adjust anything.
              </div>
            )}
            <button
              onClick={generate}
              disabled={genBusy}
              className="btn-primary mt-3 w-full"
            >
              <Sparkles className="h-4 w-4" />
              {genBusy ? "Generating…" : "Generate brief"}
            </button>
          </section>

          <section className="card p-6 text-sm text-slate-500">
            <h3 className="flex items-center gap-1.5 font-bold text-slate-900">
              <FileText className="h-4 w-4 text-violet-500" /> Tips for great briefs
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs leading-relaxed">
              <li>Name the exact deliverable formats and counts.</li>
              <li>Set a realistic budget — match scores check fit.</li>
              <li>List the AI tools you require (they weigh 30% of matching).</li>
              <li>Clarify usage rights to avoid scope surprises.</li>
            </ul>
          </section>
        </aside>


        {/* Right: the form */}
        <form onSubmit={submit} className="card space-y-5 p-6 lg:col-span-2">
          {error && <ErrorBox message={error} />}

          <div>
            <label className="label" htmlFor="btitle">Campaign title *</label>
            <input
              id="btitle" required minLength={3} className="input"
              placeholder="e.g. Nova EV — 'Silent Roads' launch film"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="bobj">Campaign objective *</label>
            <textarea
              id="bobj" className="input min-h-[90px]"
              placeholder="What should this campaign achieve?"
              value={form.objective}
              onChange={(e) => set("objective", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="baud">Target audience *</label>
              <input
                id="baud" className="input" placeholder="e.g. Urban professionals 28–45"
                value={form.audience} onChange={(e) => set("audience", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="bdeadline">Deadline *</label>
              <input
                id="bdeadline" type="date" required className="input"
                value={form.deadline} onChange={(e) => set("deadline", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="btype">Content type</label>
              <select
                id="btype" className="input"
                value={form.content_type}
                onChange={(e) => set("content_type", e.target.value)}
              >
                {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="bstyle">Preferred style</label>
              <select
                id="bstyle" className="input"
                value={form.preferred_style}
                onChange={(e) => set("preferred_style", e.target.value)}
              >
                {STYLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Required skills (powers 30% of matching)</label>
            <div className="flex flex-wrap gap-1.5">
              {SKILLS.map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => toggleIn("required_skills", s)}
                  className={
                    form.required_skills.includes(s)
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
            <label className="label">Required AI tools</label>
            <div className="flex flex-wrap gap-1.5">
              {TOOLS.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => toggleIn("required_tools", t)}
                  className={
                    form.required_tools.includes(t)
                      ? "chip !bg-indigo-600 !text-white !border-indigo-600"
                      : "chip-slate hover:border-indigo-300"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="bmin">Budget min ($) *</label>
              <input
                id="bmin" type="number" min={0} className="input"
                value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="bmax">Budget max ($) *</label>
              <input
                id="bmax" type="number" min={0} className="input"
                value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="brights">Usage rights</label>
              <select
                id="brights" className="input"
                value={form.usage_rights}
                onChange={(e) => set("usage_rights", e.target.value)}
              >
                {USAGE_RIGHTS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bdeliv">Deliverables *</label>
            <textarea
              id="bdeliv" className="input min-h-[80px]"
              placeholder="e.g. 1 × 60s hero film (16:9), 2 × 15s vertical cutdowns, captions"
              value={form.deliverables}
              onChange={(e) => set("deliverables", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {(["published", "draft"] as const).map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => setStatus(s)}
                  className={
                    status === s
                      ? "chip !px-3 !py-1.5 !bg-violet-600 !text-white !border-violet-600"
                      : "chip-slate !px-3 !py-1.5"
                  }
                >
                  {s === "published" ? "Publish now" : "Save as draft"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Link to="/briefs" className="btn-secondary">Cancel</Link>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Saving…" : status === "published" ? "Publish & see matches" : "Save draft"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

