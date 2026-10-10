# CreatorAI — AI Content Creator Marketplace

> Built for **HacXLerate 2026**. A full-stack marketplace connecting **brands** with
> **AI creators**: discover talent, publish creative briefs, review explainable
> AI match scores, and manage engagements from invitation to final delivery.

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS · FastAPI · SQLite + SQLAlchemy ·
Python matching engine · Lucide icons · Fetch API

---

## Demo accounts

All demo accounts use the password **`demo12345`**. These are fictional demo
accounts with seeded demo data — they are not real users.

### Brands

| Email | Name | What to try |
|---|---|---|
| `demo@novamedia.test` | Elena Voss — Nova Media | Primary brand demo: briefs, AI matches, invitations, proposals, reviews |
| `demo@pulseagency.test` | Marcus Hale — Pulse Agency | Second brand with an active project |
| `demo@luminalabs.test` | Priya Nair — Lumina Labs | Draft + published briefs |

### Creators

| Email | Name | Specialty |
|---|---|---|
| `aria@creatorai.test` | Aria Chen | AI filmmaking (primary creator demo: invitations, proposals, uploads) |
| `kai@creatorai.test` | Kai Morales | AI animation |
| `mina@creatorai.test` | Mina Okafor | AI-generated images |
| `leo@creatorai.test` | Leo Petrov | AI product advertisements |
| `sana@creatorai.test` | Sana Rai | AI storytelling |
| `theo@creatorai.test` | Theo Lindqvist | Generative 3D design |
| `yuki@creatorai.test` | Yuki Tanaka | AI filmmaking |
| `imani@creatorai.test` | Imani Brooks | AI animation |

---

## Local addresses

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend API (FastAPI) | http://localhost:8000 |
| API docs (Swagger UI) | http://localhost:8000/docs |
| API health check | http://localhost:8000/api/health |

---

## Prerequisites

- **Windows 10/11** with **VS Code** (recommended terminal: PowerShell)
- **Python 3.11+** (tested with Python 3.14) — https://www.python.org/downloads/
- **Node.js 18+ LTS** — https://nodejs.org (v22/v24 both work)
- No paid APIs or external services are required. Everything runs locally.

> **PATH note:** if `node`/`npm` are not found, a portable Node may be installed
> at `%LOCALAPPDATA%\Programs\nodejs`. Open a **new** terminal (the installer
> appends it to your user PATH) or prefix commands with
> `$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:PATH"`.

---

## Quick start (Windows PowerShell)

Open the project folder in VS Code (`File → Open Folder…` → `creatorai`), then run
each block **in a separate terminal tab**.

### 1) Backend — virtual environment + dependencies

```powershell
cd "d:\AI Content Creator Marketplace\creatorai\backend"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 2) Initialize & seed the database

```powershell
cd "d:\AI Content Creator Marketplace\creatorai\backend"
.\.venv\Scripts\python.exe seed.py            # fresh seed (creates creatorai.db)
.\.venv\Scripts\python.exe seed.py --reset    # OPTIONAL: wipe & re-seed
```

> You should see: `Seeded 3 brands, 8 creators, 5 briefs and demo projects.`
> The API also auto-seeds on first start if the database is empty, so this step
> is technically optional — but recommended so you can see the output.

### 3) Start the backend (FastAPI + Uvicorn)

```powershell
cd "d:\AI Content Creator Marketplace\creatorai\backend"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Verify: open http://localhost:8000/api/health → `{"status":"ok", …}`
Swagger UI: http://localhost:8000/docs

### 4) Frontend — dependencies

```powershell
cd "d:\AI Content Creator Marketplace\creatorai\frontend"
npm install
```

### 5) Start the frontend (Vite)

```powershell
cd "d:\AI Content Creator Marketplace\creatorai\frontend"
npm run dev
```

Open **http://localhost:5173** 🎉

> Shortcut: run `.\scripts\start-backend.ps1` and `.\scripts\start-frontend.ps1`
> (each handles venv/PATH setup automatically).

---

## End-to-end demo walkthrough

1. **Log in** at http://localhost:5173/login → click the **“Brand demo”** card
   (fills `demo@novamedia.test` / `demo12345`) → **Log in**.
2. **Brand dashboard** — stats, pending proposals, recent briefs.
3. **Briefs → New brief** — fill the form or type a one-line idea and click
   **Generate brief** (local template engine) → **Publish & see matches**.
4. **AI matching results** — every creator shows a **MatchScore /100** with five
   weighted components (skills 30%, portfolio 25%, budget 20%, experience 15%,
   availability 10%) plus plain-English reasons. Click **Send invitation**.
5. **Log out → log in as creator** (`aria@creatorai.test`) → **Dashboard** →
   **Accept** the invitation → **Submit proposal** (cover letter, budget, days).
6. **Back to the brand** → Dashboard → **Accept & start** the proposal →
   the project moves to *In Production*.
7. **Creator** → Projects → open the project → upload a deliverable (optional)
   → **Submit for review**.
8. **Brand** → project → **Request revision** or **Approve**, then
   **Mark as delivered** → leave a **review** (updates the creator's rating).
9. **Marketplace** (`/discover`) — search, filter by specialty/availability/
   budget, **shortlist** (❤) and **compare up to 3** creators side by side.

---

## Project structure

```
creatorai/
├── frontend/                 # React + Vite + TS + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts        # dev server + /api proxy
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx, App.tsx # routes
│       ├── lib/              # api client, types
│       ├── context/          # Auth, Compare (max 3)
│       ├── components/       # Navbar, CreatorCard, StatusStepper, MatchScorePanel…
│       └── pages/            # Landing, Login, Register, BrandDashboard, Marketplace,
│                             # CreatorProfile, BriefCreate, MyBriefs, MatchResults,
│                             # CreatorDashboard, CreatorPortfolio, OpenBriefs,
│                             # Projects, ProjectDetail, Compare, Shortlist, NotFound
├── backend/
│   ├── main.py               # FastAPI app + CORS + Swagger
│   ├── database.py           # SQLite engine/session (creatorai.db)
│   ├── models.py             # 11 tables + workflow definitions
│   ├── schemas.py            # Pydantic request/response models
│   ├── matching.py           # Explainable weighted scoring engine
│   ├── brief_generator.py    # Template-based brief generator (LLM-ready)
│   ├── security.py           # PBKDF2 hashing, JWT, role dependencies
│   ├── seed.py               # Demo data (python seed.py [--reset])
│   ├── requirements.txt
│   ├── routers/              # auth, creators, briefs, matching, projects
│   └── uploads/              # Deliverable files (safe upload handling)
├── scripts/
│   ├── start-backend.ps1     # venv + uvicorn launcher
│   ├── start-frontend.ps1    # npm run dev launcher
│   └── run_all_tests.ps1     # end-to-end API smoke tests (39 checks)
├── .gitignore
└── README.md
```

---

## The matching engine (transparency)

CreatorAI's matching is a **scoring-based recommendation engine** — a transparent,
rules-driven system over real profile data. **It is not a trained machine-learning
model**, and we deliberately describe it that way. Every match shows:

| Component | Weight | What it looks at |
|---|---|---|
| Skill compatibility | 30% | brief's required skills/tools vs. declared skills, tools, specialties |
| Portfolio & style relevance | 25% | portfolio categories, style tags, tools vs. brief content type/style |
| Budget compatibility | 20% | creator price range vs. brief budget range |
| Experience & reviews | 15% | years, delivered projects, average rating (confidence-weighted) |
| Availability | 10% | available / limited / busy + response time |

`MatchScore = Σ (component_score × weight)` → 0–100, with per-component
explanations returned by the API and rendered in the UI. Implementation:
`backend/matching.py`.

## Brief generation

`POST /api/briefs/generate` turns a one-line idea into a structured brief
(title, objective, audience, content type, style, skills, tools, budget,
deadline, deliverables, usage rights) using a **local template engine**.
The architecture is **LLM-ready**: set `LLM_API_URL` + `LLM_API_KEY` and the
same endpoint will call your LLM first, falling back to templates on any failure.
No paid API is needed for the demo.

## Project workflow

```
Brief Published → Creator Matched → Invitation Sent → Proposal Submitted
→ In Production → In Review → Revision Requested → Approved → Delivered
```

Transitions are enforced server-side (`TRANSITIONS` / `TRANSITION_ROLES` in
`backend/routers/projects.py`) — e.g. only creators submit for review, only
brands approve/request revisions. Every change is persisted as an event in
`project_events` and shown in the project's Activity history.

---

## API overview (28 endpoints)

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Creators | `GET /api/creators` (search/filter/sort), `GET /api/creators/{id}`, profile + portfolio CRUD |
| Shortlists | `GET/POST /api/shortlists`, `DELETE /api/shortlists/{creator_id}` |
| Briefs | `POST/GET/PATCH/DELETE /api/briefs`, `POST /api/briefs/generate` |
| Matching | `GET /api/matches/{brief_id}` — ranked, explainable results |
| Workflow | invitations, proposals, projects, status transitions, milestones, reviews |
| Files | `POST /api/projects/{id}/deliverables` (validated upload), `GET /api/files/{name}` |
| Meta | `GET /api/health`, Swagger UI at `/docs` |

**Security:** JWT bearer auth · **PBKDF2-HMAC-SHA256** password hashing
(210k iterations, per-user salt) · Pydantic input validation · role-based access
(brand/creator) · CORS locked to `localhost:5173` · file uploads restricted by
extension allowlist + 25 MB cap + UUID-renamed files (no path traversal).

## Automated tests

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd "d:\AI Content Creator Marketplace\creatorai\scripts"
.\run_all_tests.ps1
```

39 end-to-end checks: auth, search/filters, brief CRUD, generation, matching
weights, the full invitation → proposal → production → review → revision →
approval → delivery workflow, invalid-transition rejection, role guards (403),
auth guards (401), upload allowlisting (415), reviews and CORS.
**Current status: 39/39 passing.**

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm : File … npm.ps1 cannot be loaded` | PowerShell blocks `.ps1` scripts. Use `npm.cmd` (e.g. `npm.cmd run dev`) or run `Set-ExecutionPolicy -Scope Process RemoteSigned`. |
| `python -m venv` fails | Reinstall Python with “Add python.exe to PATH”, or use `py -m venv .venv`. |
| Port 8000/5173 already in use | `Get-NetTCPConnection -LocalPort 8000 | Select OwningProcess` then `Stop-Process -Id <pid> -Force`, or change ports (`uvicorn --port 8001` + `VITE_API_URL=http://127.0.0.1:8001`). |
| Frontend shows “Failed to fetch” | Is the backend running on :8000? Check http://localhost:8000/api/health |
| 401 right after login | Token expired (7 days) — log out/in, or clear storage via DevTools: `localStorage.clear()`. |
| `database is locked` | Only run one uvicorn instance; stop old processes. |
| Reset all demo data | Stop backend → `.\.venv\Scripts\python.exe seed.py --reset` → restart. |
| Unicode/encoding glitches in PowerShell logs | PowerShell `*>` redirects are UTF-16 — read with `Get-Content file.log -Encoding Unicode`. |
| Firewall prompt for Node/Python | Allow on private networks, or keep hosts bound to `127.0.0.1` as shown. |
| Registration rejects an email | Demo uses reserved `.test` domains — the API intentionally disables DNS deliverability checks so offline/demo emails work. |

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `CREATORAI_SECRET` | backend env | dev secret | JWT signing key (**set this in production**) |
| `CREATORAI_DB` | backend env | `backend/creatorai.db` | SQLite database path |
| `LLM_API_URL` / `LLM_API_KEY` | backend env | unset | Optional LLM brief generation |
| `VITE_API_URL` | frontend env | `http://127.0.0.1:8000` | API base URL |

## License

Demo/educational project for HacXLerate 2026. All creators, brands and content
are fictional sample data.



