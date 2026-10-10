"""Creative brief CRUD, AI brief generation and matching results."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from brief_generator import generate_brief
from database import get_db
from matching import ALGORITHM_DESCRIPTION, WEIGHTS, rank_creators
from models import Brief, CreatorProfile, PortfolioItem, User
from schemas import (
    BriefCreate,
    BriefGenerateInput,
    BriefGenerateOutput,
    BriefOut,
    BriefUpdate,
    MatchResponse,
)
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/briefs", tags=["briefs"])


def _get_owned_brief(db: Session, brief_id: int, user: User) -> Brief:
    brief = db.get(Brief, brief_id)
    if brief is None:
        raise HTTPException(status_code=404, detail="Brief not found.")
    if brief.brand_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this brief.")
    return brief


@router.post("", response_model=BriefOut, status_code=201)
def create_brief(
    payload: BriefCreate,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    if payload.budget_max and payload.budget_min > payload.budget_max:
        raise HTTPException(status_code=422, detail="budget_min must be <= budget_max.")
    brief = Brief(brand_id=user.id, **payload.model_dump())
    db.add(brief)
    db.commit()
    db.refresh(brief)
    return BriefOut.model_validate(brief)


@router.get("", response_model=List[BriefOut])
def list_briefs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mine: bool = Query(default=False),
    status: Optional[str] = None,
):
    """List briefs. `mine=true` returns the caller's own briefs (brands)."""
    q = db.query(Brief)
    if mine:
        if user.role != "brand":
            raise HTTPException(status_code=403, detail="Only brands own briefs.")
        q = q.filter(Brief.brand_id == user.id)
    else:
        # Public discovery feed: published briefs only.
        q = q.filter(Brief.status == "published")
    if status:
        q = q.filter(Brief.status == status)
    rows = q.order_by(Brief.created_at.desc()).all()
    return [BriefOut.model_validate(b) for b in rows]


@router.post("/generate", response_model=BriefGenerateOutput)
def generate(
    payload: BriefGenerateInput,
    user: User = Depends(require_roles("brand")),
):
    """Turn a short idea into a structured brief (local template, LLM-ready)."""
    return BriefGenerateOutput(**generate_brief(payload.idea))


@router.get("/{brief_id}", response_model=BriefOut)
def brief_detail(brief_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    brief = db.get(Brief, brief_id)
    if brief is None:
        raise HTTPException(status_code=404, detail="Brief not found.")
    if brief.status != "published" and brief.brand_id != user.id:
        raise HTTPException(status_code=403, detail="This brief is not published.")
    return BriefOut.model_validate(brief)


@router.patch("/{brief_id}", response_model=BriefOut)
def update_brief(
    brief_id: int,
    payload: BriefUpdate,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    brief = _get_owned_brief(db, brief_id, user)
    data = payload.model_dump(exclude_unset=True)
    if (
        "budget_min" in data and "budget_max" in data
        and data["budget_max"] and data["budget_min"] > data["budget_max"]
    ):
        raise HTTPException(status_code=422, detail="budget_min must be <= budget_max.")
    for field, value in data.items():
        setattr(brief, field, value)
    db.commit()
    db.refresh(brief)
    return BriefOut.model_validate(brief)


@router.delete("/{brief_id}", status_code=204)
def delete_brief(
    brief_id: int,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    brief = _get_owned_brief(db, brief_id, user)
    db.delete(brief)
    db.commit()
