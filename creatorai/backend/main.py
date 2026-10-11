"""
CreatorAI — AI Content Creator Marketplace API.

FastAPI application: CORS for the Vite dev/prod origins, SQLAlchemy (SQLite by
default, Postgres via DATABASE_URL), JWT auth, Swagger docs at /docs.
"""
import os
import sys
import warnings
from contextlib import asynccontextmanager

# Ensure the backend directory is on sys.path so "import models",
# "from database import ...", and "from routers import ..." work
# regardless of the current working directory.
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

import models
from database import Base, engine
from routers import auth, briefs, creators, matching_router, projects

# Create tables on startup (SQLite — no migration step needed for the demo).
Base.metadata.create_all(bind=engine)

_DEFAULT_SECRET = "creatorai-dev-secret-change-in-production"


def _extra_origins() -> list[str]:
    """Extra CORS origins from the CORS_ORIGINS env var (comma-separated).

    Use this in production to allow your deployed frontend, e.g.
    CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
    """
    raw = os.environ.get("CORS_ORIGINS", "")
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the uploads directory exists (may live on a persistent disk).
    os.makedirs(projects.UPLOAD_DIR, exist_ok=True)

    # Fail loudly in production if the JWT secret is still the dev default.
    if os.environ.get("CREATORAI_ENV") == "production" and (
        os.environ.get("CREATORAI_SECRET", _DEFAULT_SECRET) == _DEFAULT_SECRET
    ):
        warnings.warn(
            "CREATORAI_SECRET is unset/using the dev default — set a strong secret "
            "in production (Render → Environment → CREATORAI_SECRET)."
        )

    from seed import run_seed_if_empty
    run_seed_if_empty()
    yield


app = FastAPI(
    title="CreatorAI API",
    description=(
        "AI Content Creator Marketplace — connects AI creators with brands. "
        "Includes explainable scoring-based matching (not a trained ML model), "
        "creative briefs, invitations, proposals and project workflows."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local dev (Vite dev + preview servers).
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        # Production origins from the environment (your Vercel/Netlify domain).
        *_extra_origins(),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(creators.router)
app.include_router(briefs.router)
app.include_router(matching_router.router)
app.include_router(projects.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {
        "status": "ok",
        "service": "creatorai-api",
        "models": [
            m.__name__
            for m in (
                models.User, models.CreatorProfile, models.PortfolioItem,
                models.Brief, models.Shortlist, models.Project,
                models.Invitation, models.Proposal, models.Milestone,
                models.Deliverable, models.Review,
            )
        ],
    }


# ---------------------------------------------------------------------------
# Serve the built frontend (single-service deployment).
#
# When the React app is built (`npm run build`) its output is copied into
# `backend/static/`. This app then serves it at the SAME origin as the API, so
# there is one deploy, one URL, and no CORS / VITE_API_URL needed. If `static/`
# is absent (API-only local dev) this block is skipped and only the API runs.
#
# API routes, /docs and /openapi.json are registered earlier, so they are
# matched before this catch-all; everything else returns index.html so
# react-router deep links (/login, /brand, refresh) work.
# ---------------------------------------------------------------------------
_STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(_STATIC_DIR) and os.path.isfile(os.path.join(_STATIC_DIR, "index.html")):
    _assets_dir = os.path.join(_STATIC_DIR, "assets")
    if os.path.isdir(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(os.path.join(_STATIC_DIR, "index.html"))

    print(f"[startup] Serving frontend from {_STATIC_DIR}")
else:
    # API-only mode. In production this means the build step did not populate
    # static/, so the SPA returns {"detail":"Not Found"}. Check that the Render
    # Build Command is 'bash build.sh' (Root Directory: creatorai/backend).
    print(
        f"[startup] WARNING: frontend not found at {_STATIC_DIR} — running API-only. "
        "If this is production, set the Render Build Command to 'bash build.sh'."
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_not_built(full_path: str):
        # The API works, but the React app was not built into static/ during
        # deploy. Return a clear HTML page instead of a bare 404 so the cause
        # is obvious in the browser.
        html = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width, initial-scale=1'>"
            "<title>CreatorAI — backend running, frontend not built</title>"
            "<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;"
            "display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}"
            ".card{max-width:640px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px}"
            "h1{color:#a78bfa;margin:0 0 8px}p{line-height:1.6;color:#cbd5e1}"
            "code{background:#0f172a;padding:2px 6px;border-radius:6px;color:#93c5fd}"
            ".ok{color:#34d399;font-weight:600}</style></head><body><div class='card'>"
            "<h1>Backend is running ✅</h1>"
            "<p>The API is live (<code>/api/health</code> returns <span class='ok'>ok</span>), "
            "but the <strong>frontend was not built</strong> into the <code>static/</code> folder during deploy.</p>"
            "<p><strong>Fix (in Render → your service → Settings → Build &amp; Deploy):</strong></p>"
            "<p>Set <strong>Build Command</strong> to <code>bash build.sh</code> "
            "(and <strong>Root Directory</strong> to <code>creatorai/backend</code>), "
            "then <strong>Manual Deploy → Deploy latest commit</strong>.</p>"
            "<p>The build log should show <code>==&gt; [1/3] Building frontend</code> … "
            "<code>==&gt; Build complete</code>. If it doesn't, the build command isn't running build.sh.</p>"
            "</div></body></html>"
        )
        return HTMLResponse(content=html, status_code=200)

