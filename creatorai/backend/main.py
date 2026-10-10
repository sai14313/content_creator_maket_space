"""
CreatorAI — AI Content Creator Marketplace API.

FastAPI application: CORS for the Vite dev/prod origins, SQLAlchemy (SQLite by
default, Postgres via DATABASE_URL), JWT auth, Swagger docs at /docs.
"""
import os
import warnings
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
