"""Database configuration for CreatorAI — SQLite by default, optional Postgres.

Persistence strategy for production:
  * SQLite (default): point CREATORAI_DB at a persistent disk path (e.g. Render
    Persistent Disk mounted at /data → CREATORAI_DB=/data/creatorai.db).
  * Postgres: set DATABASE_URL (e.g. Render Postgres / Neon) and the app uses it
    automatically. `check_same_thread` is a SQLite-only connect arg, so it is only
    applied when the URL is sqlite.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Prefer an explicit DATABASE_URL (Postgres in production) when provided.
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

if not DATABASE_URL:
    DB_PATH = os.environ.get("CREATORAI_DB", os.path.join(BASE_DIR, "creatorai.db"))
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# `check_same_thread` is SQLite-specific — skip it for Postgres/other backends.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Postgres URLs from some providers use postgres:// — SQLAlchemy expects postgresql://.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
