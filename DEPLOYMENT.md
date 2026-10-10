# CreatorAI — Public Deployment Guide (Vercel + Render)

Publishes the app to a public URL that works on any device/browser, worldwide,
even when your computer is off.

- **Frontend (React + Vite)** → **Vercel** (global CDN, automatic HTTPS, SPA routing)
- **Backend (FastAPI + SQLite)** → **Render** with a **Persistent Disk** (data survives restarts)

The frontend talks to the backend through the `VITE_API_URL` environment variable —
nothing is hardcoded. The backend allows your frontend origin through the
`CORS_ORIGINS` environment variable.

---

## Prerequisites

1. A [GitHub](https://github.com) account (free)
2. A [Vercel](https://vercel.com) account (sign in with GitHub)
3. A [Render](https://render.com) account (sign in with GitHub)
4. [Git](https://git-scm.com/downloads) installed on your machine

> No secrets are stored in the repo. The `.env.example` files document the
> variables; real values are entered in the Vercel/Render dashboards.

---

## Part 1 — Push the project to GitHub

Open a terminal in the workspace root `d:\AI Content Creator Marketplace` and run:

```bash
# 1. Initialize git (only if not already a repo)
git init

# 2. Confirm secrets / build output are ignored (already configured in .gitignore).
#    .env, *.db, uploads, node_modules, .venv, dist are ignored automatically.

# 3. Stage everything
git add .

# 4. Verify NO secrets or database are staged (should print nothing):
git status --porcelain | findstr /I "\.env creatorai.db node_modules"   # Windows
# git status --porcelain | grep -E "\.env|creatorai.db|node_modules"    # macOS/Linux

# 5. Commit
git commit -m "Prepare CreatorAI for public deployment (Vercel + Render)"

# 6. Create the repo on GitHub, then link and push.
#    Replace <YOUR_USERNAME> with your GitHub username.
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/creatorai.git
git push -u origin main
```

> If you have the GitHub CLI installed: `gh repo create creatorai --public --source=. --push`

---

## Part 2 — Deploy the backend on Render

1. Go to <https://dashboard.render.com> → **New +** → **Blueprint**.
2. Connect GitHub and select the **creatorai** repo. Render auto-detects `render.yaml`.
3. Render shows a Web Service `creatorai-api` (plan **Starter**, ~$7/mo) and a
   1 GB Persistent Disk. Click **Apply**.
   - The Persistent Disk is what makes your data persistent. The free instance
     tier does **not** support disks — see the free alternative below.
4. When asked for `CORS_ORIGINS`, you don't know the Vercel URL yet — type a
   placeholder like `https://placeholder.vercel.app`. You will update it in Part 4.
   - `CREATORAI_SECRET` is auto-generated for you (safe).
5. Wait for the deploy. Render prints a URL like `https://creatorai-api.onrender.com`.
6. Verify: `<render-url>/api/health` → `{"status":"ok", ...}` and `<render-url>/docs` → Swagger UI.

### Free alternative (no paid disk)

1. Create a free Postgres DB at [Neon](https://neon.tech) and copy its connection string.
2. In `render.yaml`, change `plan` to `free` and remove the `disk:` block (or deploy
   the service manually from the dashboard without a disk).
3. Add env var in Render: `DATABASE_URL = <Neon connection string>`. The app
   auto-switches from SQLite to Postgres (already supported in `database.py`).
4. On the free instance, **uploaded files** won't persist between restarts (the DB will).
   To persist uploads, add Cloudflare R2 or AWS S3 (small change in `routers/projects.py`).

---

## Part 3 — Deploy the frontend on Vercel

1. Go to <https://vercel.com/new> → **Import** the **creatorai** GitHub repo.
2. **Root Directory:** set to `creatorai/frontend`  ← important (the app is in this subfolder).
   - Vercel auto-detects **Vite**, build `npm run build`, output `dist`. The included
     `vercel.json` adds SPA rewrites + asset caching.
3. **Environment Variables:** add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://<your-render-url>`  (backend URL from Part 2)
4. **Deploy**. Vercel gives a URL like `https://creatorai.vercel.app`.

---

## Part 4 — Connect the two (CORS)

1. In Render → `creatorai-api` → **Environment**.
2. Set `CORS_ORIGINS` to your Vercel URL, e.g. `https://creatorai.vercel.app`
   (comma-separated for multiple/preview origins).
3. Save — Render redeploys automatically.

> Vercel preview deploys get random URLs (`creatorai-git-*.vercel.app`). Add those to
> `CORS_ORIGINS`, or set a stable custom domain for production.

---

## Part 5 — Final verification checklist

Open your public Vercel URL and confirm:

- [ ] Landing page loads over **HTTPS** (padlock in the address bar)
- [ ] `Register` creates an account and `Login` works (JWT auth)
- [ ] `Discover` marketplace lists creators
- [ ] Indian Rupee formatting shows `₹` with lakh grouping (e.g. `₹1,10,000`)
- [ ] A brand can publish a brief and view match results
- [ ] A creator can view open briefs and submit a proposal
- [ ] Footer **API docs** link opens your Render `/docs`
- [ ] Restart the Render service (Manual Deploy) → registered users still log in
      (proves the persistent database works)
- [ ] Test on a phone browser and a resized window → layout is responsive

---

## Environment variables summary

| Variable            | Set in  | Purpose                                        | Required?  |
|---------------------|---------|------------------------------------------------|------------|
| `VITE_API_URL`      | Vercel  | Backend API URL used by the frontend           | Yes (prod) |
| `CORS_ORIGINS`      | Render  | Allowed frontend origin(s)                     | Yes (prod) |
| `CREATORAI_SECRET`  | Render  | JWT signing secret (auto-generated by blueprint)| Yes (prod)|
| `CREATORAI_DB`      | Render  | SQLite path on the disk (`/data/creatorai.db`) | Blueprint  |
| `CREATORAI_UPLOADS` | Render  | Upload dir on the disk (`/data/uploads`)       | Blueprint  |
| `DATABASE_URL`      | Render  | Optional Postgres URL (free alternative)       | No         |

---

## Local development (unchanged)

```bash
# Backend
cd creatorai/backend
python -m venv .venv && . .venv/Scripts/Activate      # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd creatorai/frontend
npm install
npm run dev            # http://localhost:5173 (falls back to http://127.0.0.1:8000)
```

