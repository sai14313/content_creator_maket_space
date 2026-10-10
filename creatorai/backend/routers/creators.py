"""Creator discovery, profile management, portfolios and shortlists."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from matching import serialize_creator_card
from models import Brief, CreatorProfile, PortfolioItem, Shortlist, User
from schemas import (
    CreatorCardOut,
    CreatorProfileOut,
    CreatorProfileUpdate,
    PortfolioItemIn,
    PortfolioItemOut,
    ShortlistIn,
    ShortlistOut,
)
from security import require_roles

router = APIRouter(prefix="/api", tags=["creators"])


def load_creator_cards(db: Session) -> List[CreatorCardOut]:
    """All creators with their portfolio items, card-serialized."""
    rows = (
        db.query(CreatorProfile, User)
        .join(User, CreatorProfile.user_id == User.id)
        .order_by(CreatorProfile.id)
        .all()
    )
    cards = []
    for profile, user in rows:
        items = (
            db.query(PortfolioItem)
            .filter(PortfolioItem.creator_id == profile.id)
            .order_by(PortfolioItem.id)
            .all()
        )
        cards.append(
            serialize_creator_card(profile, items, user.full_name, user.company)
        )
    return cards


def get_profile_or_404(db: Session, creator_id: int) -> CreatorProfile:
    profile = db.get(CreatorProfile, creator_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Creator not found.")
    return profile


@router.get("/creators", response_model=List[CreatorCardOut])
def list_creators(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, description="Free-text search"),
    specialty: Optional[str] = None,
    tool: Optional[str] = None,
    availability: Optional[str] = None,
    min_price: Optional[int] = Query(default=None, ge=0),
    max_price: Optional[int] = Query(default=None, ge=0),
    min_rating: Optional[float] = Query(default=None, ge=0, le=5),
    sort: Optional[str] = Query(default="rating"),  # rating|price_asc|price_desc|experience
):
    """Search & filter creators (skills, tools, price, availability, rating)."""
    cards = load_creator_cards(db)

    if q:
        needle = q.lower().strip()
        def matches(c: CreatorCardOut) -> bool:
            hay = " ".join(
                [c.full_name, c.headline, c.bio, c.location, c.company or ""]
                + c.skills + c.ai_tools + c.specialties
                + [i.title for i in c.portfolio]
            ).lower()
            return needle in hay
        cards = [c for c in cards if matches(c)]

    if specialty:
        cards = [
            c for c in cards
            if any(specialty.lower() in s.lower() for s in c.specialties + c.skills)
        ]
    if tool:
        cards = [c for c in cards if any(tool.lower() in t.lower() for t in c.ai_tools)]
    if availability:
        cards = [c for c in cards if c.availability == availability]
    if min_price is not None:
        cards = [c for c in cards if c.price_max >= min_price]
    if max_price is not None:
        cards = [c for c in cards if c.price_min <= max_price]
    if min_rating is not None:
        cards = [c for c in cards if c.rating >= min_rating]

    sorters = {
        "rating": lambda c: (-c.rating, -c.review_count),
        "price_asc": lambda c: c.price_min,
        "price_desc": lambda c: -c.price_max,
        "experience": lambda c: -c.experience_years,
    }
    cards.sort(key=sorters.get(sort, sorters["rating"]))
    return cards


@router.get("/creators/{creator_id}", response_model=CreatorCardOut)
def creator_detail(creator_id: int, db: Session = Depends(get_db)):
    profile = get_profile_or_404(db, creator_id)
    user = db.get(User, profile.user_id)
    items = (
        db.query(PortfolioItem)
        .filter(PortfolioItem.creator_id == profile.id)
        .order_by(PortfolioItem.id)
        .all()
    )
    return serialize_creator_card(profile, items, user.full_name, user.company)


@router.get("/creators/me/profile", response_model=CreatorProfileOut)
def my_profile(
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, user.creator_profile.id)
    return CreatorProfileOut.model_validate(profile)


@router.put("/creators/me/profile", response_model=CreatorProfileOut)
def update_profile(
    payload: CreatorProfileUpdate,
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    profile = user.creator_profile
    data = payload.model_dump(exclude_unset=True)
    if "price_min" in data and "price_max" in data:
        if data["price_max"] < data["price_min"]:
            raise HTTPException(status_code=422, detail="price_max must be >= price_min.")
    for field, value in data.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return CreatorProfileOut.model_validate(profile)


# ---------------------------------------------------------------------------
# Portfolio management (creator)
# ---------------------------------------------------------------------------
@router.get("/creators/me/portfolio", response_model=List[PortfolioItemOut])
def my_portfolio(
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    items = (
        db.query(PortfolioItem)
        .filter(PortfolioItem.creator_id == user.creator_profile.id)
        .order_by(PortfolioItem.id)
        .all()
    )
    return [PortfolioItemOut.model_validate(i) for i in items]


@router.post("/creators/me/portfolio", response_model=PortfolioItemOut, status_code=201)
def add_portfolio_item(
    payload: PortfolioItemIn,
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    item = PortfolioItem(creator_id=user.creator_profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return PortfolioItemOut.model_validate(item)


@router.delete("/creators/me/portfolio/{item_id}", status_code=204)
def delete_portfolio_item(
    item_id: int,
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    item = db.get(PortfolioItem, item_id)
    if item is None or item.creator_id != user.creator_profile.id:
        raise HTTPException(status_code=404, detail="Portfolio item not found.")
    db.delete(item)
    db.commit()


# ---------------------------------------------------------------------------
# Shortlists (brand)
# ---------------------------------------------------------------------------
@router.get("/shortlists", response_model=List[ShortlistOut])
def list_shortlists(
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    rows = db.query(Shortlist).filter(Shortlist.brand_id == user.id).all()
    out = []
    for row in rows:
        profile = db.get(CreatorProfile, row.creator_id)
        if profile is None:
            continue
        creator_user = db.get(User, profile.user_id)
        items = (
            db.query(PortfolioItem)
            .filter(PortfolioItem.creator_id == profile.id)
            .order_by(PortfolioItem.id)
            .all()
        )
        out.append(
            ShortlistOut(
                creator=serialize_creator_card(
                    profile, items, creator_user.full_name, creator_user.company
                )
            )
        )
    return out


@router.post("/shortlists", response_model=ShortlistOut, status_code=201)
def add_to_shortlist(
    payload: ShortlistIn,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(db, payload.creator_id)
    existing = (
        db.query(Shortlist)
        .filter(Shortlist.brand_id == user.id, Shortlist.creator_id == payload.creator_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Creator is already shortlisted.")
    db.add(Shortlist(brand_id=user.id, creator_id=payload.creator_id))
    db.commit()
    creator_user = db.get(User, profile.user_id)
    items = (
        db.query(PortfolioItem)
        .filter(PortfolioItem.creator_id == profile.id)
        .all()
    )
    return ShortlistOut(
        creator=serialize_creator_card(profile, items, creator_user.full_name, creator_user.company)
    )


@router.delete("/shortlists/{creator_id}", status_code=204)
def remove_from_shortlist(
    creator_id: int,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Shortlist)
        .filter(Shortlist.brand_id == user.id, Shortlist.creator_id == creator_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Not on your shortlist.")
    db.delete(row)
    db.commit()
