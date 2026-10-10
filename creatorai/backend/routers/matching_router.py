"""AI matching results endpoint — ranks creators for a brief with explanations."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from matching import ALGORITHM_DESCRIPTION, WEIGHTS, rank_creators
from models import Brief, CreatorProfile, PortfolioItem, User
from schemas import BriefOut, MatchResponse
from security import get_current_user, require_roles

router = APIRouter(prefix="/api/matches", tags=["matching"])


@router.get("/{brief_id}", response_model=MatchResponse)
def matches_for_brief(
    brief_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    """
    Rank all creators against a brief using the weighted scoring engine.

    Response includes per-component scores (0–100), earned points, plain-English
    explanations and aggregated reasons for every match.
    """
    brief = db.get(Brief, brief_id)
    if brief is None:
        raise HTTPException(status_code=404, detail="Brief not found.")
    if brief.brand_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this brief.")

    rows = (
        db.query(CreatorProfile, User)
        .join(User, CreatorProfile.user_id == User.id)
        .all()
    )
    payload = []
    for profile, creator_user in rows:
        items = (
            db.query(PortfolioItem)
            .filter(PortfolioItem.creator_id == profile.id)
            .all()
        )
        payload.append((profile, items, creator_user.full_name, creator_user.company))

    results = rank_creators(brief, payload, limit=limit)
    return MatchResponse(
        brief=BriefOut.model_validate(brief),
        algorithm=ALGORITHM_DESCRIPTION,
        weights={k: f"{int(v * 100)}%" for k, v in WEIGHTS.items()},
        results=results,
    )
