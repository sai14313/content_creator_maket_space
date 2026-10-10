"""
Explainable AI matching engine for CreatorAI.

TRANSPARENCY NOTE
-----------------
This is a *scoring-based recommendation engine*: a transparent, rules-driven
system that combines weighted heuristics over real profile and brief data.
It is NOT a trained machine-learning model. Every point traces back to
concrete profile facts (skills, portfolio tags, budget, reviews,
availability), which is what makes the scores explainable.

Weights (per spec):
    skill compatibility         30%
    portfolio & style relevance 25%
    budget compatibility        20%
    experience & reviews        15%
    availability                10%
"""
import re
from typing import Iterable, List, Tuple

from models import Brief, CreatorProfile, PortfolioItem
from schemas import CreatorCardOut, MatchResultOut, PortfolioItemOut, ScoreComponent

WEIGHTS = {
    "skill": 0.30,
    "portfolio": 0.25,
    "budget": 0.20,
    "experience": 0.15,
    "availability": 0.10,
}

ALGORITHM_DESCRIPTION = (
    "Weighted scoring recommendation engine (rules + heuristics over real "
    "profile data). Not a trained ML model — every score is explainable."
)

_TOKEN_RE = re.compile(r"[a-z0-9]+")

# Maps brief content types to the specialty names creators declare.
CONTENT_TYPE_TO_SPECIALTY = {
    "ai film": "AI filmmaking",
    "film": "AI filmmaking",
    "video": "AI filmmaking",
    "commercial": "AI product advertisements",
    "advertisement": "AI product advertisements",
    "product ad": "AI product advertisements",
    "animation": "AI animation",
    "images": "AI-generated images",
    "photography": "AI-generated images",
    "storytelling": "AI storytelling",
    "story": "AI storytelling",
    "3d": "Generative 3D design",
    "3d design": "Generative 3D design",
    "3d model": "Generative 3D design",
}


def _tokens(text: str) -> set:
    return set(_TOKEN_RE.findall((text or "").lower()))


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _phrase_match(needle: str, haystack: List[str]) -> bool:
    """True when `needle` (a skill/tool/specialty) appears in any haystack entry."""
    n = _norm(needle)
    if not n:
        return False
    for item in haystack:
        h = _norm(item)
        if n == h or n in h or h in n:
            return True
    return False


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


# ---------------------------------------------------------------------------
# Component 1 — Skill compatibility (30%)
# ---------------------------------------------------------------------------
def score_skills(brief: Brief, creator: CreatorProfile) -> Tuple[float, str]:
    """How well the creator's declared skills/tools/specialties cover the brief."""
    required = list(brief.required_skills or []) + list(brief.required_tools or [])
    creator_pool = list(creator.skills or []) + list(creator.ai_tools or []) + list(
        creator.specialties or []
    )

    # If the brief declares no explicit skills, fall back to its content type.
    if not required and brief.content_type:
        required = [brief.content_type]

    if not required:
        return 60.0, "Brief declares no specific skills — neutral base score applied."

    matched = [r for r in required if _phrase_match(r, creator_pool)]
    coverage = len(matched) / len(required)

    # Specialty alignment (e.g. brief "AI film" vs creator specialty "AI filmmaking").
    wanted_specialty = None
    nbrief = _norm(brief.content_type) + " " + _norm(brief.title)
    for key, spec in CONTENT_TYPE_TO_SPECIALTY.items():
        if key in nbrief:
            wanted_specialty = spec
            break
    specialty_bonus = 0.0
    if wanted_specialty and _phrase_match(wanted_specialty, creator.specialties or []):
        specialty_bonus = 10.0

    # Partial credit from style/skill token overlap.
    style_overlap = _jaccard(_tokens(brief.preferred_style), _tokens(" ".join(creator_pool)))

    score = _clamp(coverage * 90.0 + specialty_bonus + style_overlap * 10.0)
    missing = [r for r in required if r not in matched]
    if missing:
        explanation = (
            f"Covers {len(matched)}/{len(required)} required skills "
            f"({', '.join(matched[:3]) or 'none'}); missing {', '.join(missing[:2])}."
        )
    else:
        explanation = f"Covers all {len(required)} required skills ({', '.join(matched[:4])})."
    if specialty_bonus:
        explanation += f" Core specialty matches '{wanted_specialty}'."
    return round(score, 1), explanation


# ---------------------------------------------------------------------------
# Component 2 — Portfolio & style relevance (25%)
# ---------------------------------------------------------------------------
def score_portfolio(
    brief: Brief, creator: CreatorProfile, items: List[PortfolioItem]
) -> Tuple[float, str]:
    """Relevance of the creator's actual portfolio pieces to this brief."""
    if not items:
        return 35.0, "No portfolio items yet — scored on declared specialties only."

    brief_tags = (
        _tokens(brief.content_type)
        | _tokens(brief.preferred_style)
        | _tokens(brief.title)
        | {_norm(t) for t in (brief.required_tools or [])}
    )
    brief_tags.discard("")

    best_overlap = 0.0
    best_title = items[0].title
    category_hits = 0
    for item in items:
        item_tags = (
            _tokens(item.category)
            | _tokens(item.title)
            | _tokens(item.description)
            | {_norm(t) for t in (item.style_tags or [])}
            | {_norm(t) for t in (item.tools_used or [])}
        )
        overlap = len(brief_tags & item_tags) / max(1, len(brief_tags))
        if overlap > best_overlap:
            best_overlap = overlap
            best_title = item.title
        if _phrase_match(brief.content_type, [item.category]) or _phrase_match(
            brief.preferred_style, list(item.style_tags or [])
        ):
            category_hits += 1

    style_bonus = min(category_hits, 3) * 8.0
    score = _clamp(best_overlap * 70.0 + style_bonus + 15.0)

    if category_hits:
        explanation = (
            f"{category_hits} portfolio piece(s) match the brief's content type/style; "
            f"closest work: '{best_title}'."
        )
    else:
        explanation = (
            f"No direct category match; closest portfolio piece '{best_title}' "
            f"provides partial style overlap."
        )
    return round(score, 1), explanation


# ---------------------------------------------------------------------------
# Component 3 — Budget compatibility (20%)
# ---------------------------------------------------------------------------
def score_budget(brief: Brief, creator: CreatorProfile) -> Tuple[float, str]:
    """Does the creator's price range fit the brief's budget?"""
    bmin, bmax = brief.budget_min or 0, brief.budget_max or 0
    cmin, cmax = creator.price_min or 0, creator.price_max or 0

    if bmax <= 0:
        return 60.0, "Brief has no budget set — neutral base score applied."
    if cmax <= 0:
        return 50.0, "Creator has no price range set."

    if cmin >= bmin and cmax <= bmax:
        return 100.0, f"Price range ₹{cmin:,}–₹{cmax:,} fits budget ₹{bmin:,}–₹{bmax:,}."

    if cmin <= bmax < cmax:
        overshoot = (cmax - bmax) / max(1, bmax)
        score = _clamp(100.0 - overshoot * 120.0)
        return (
            round(score, 1),
            f"Starts at ₹{cmin:,} (within budget) but can reach ₹{cmax:,}, above the ₹{bmax:,} cap.",
        )

    if cmin > bmax:
        ratio = bmax / max(1, cmin)
        score = _clamp(ratio * 70.0)
        return (round(score, 1), f"Minimum price ₹{cmin:,} exceeds the ₹{bmax:,} budget cap.")

    if cmax < bmin:
        return 100.0, f"Entirely within budget (₹{cmin:,}–₹{cmax:,} below the ₹{bmin:,} floor)."

    overlap = min(cmax, bmax) - max(cmin, bmin)
    span = max(1, cmax - cmin)
    return (
        round(_clamp(50 + 50 * (overlap / span)), 1),
        f"Partial overlap between ₹{cmin:,}–₹{cmax:,} and budget ₹{bmin:,}–₹{bmax:,}.",
    )


# ---------------------------------------------------------------------------
# Component 4 — Experience & reviews (15%)
# ---------------------------------------------------------------------------
def score_experience(brief: Brief, creator: CreatorProfile) -> Tuple[float, str]:
    """Blend of years of experience, delivered projects and client ratings."""
    years = creator.experience_years or 0
    rating = creator.rating or 0.0
    reviews = creator.review_count or 0
    completed = creator.completed_projects or 0

    experience_part = _clamp(years / 8.0 * 100.0) * 0.45
    delivery_part = _clamp(completed / 40.0 * 100.0) * 0.25
    rating_part = ((rating / 5.0) * 100.0 if rating > 0 else 70.0) * 0.30
    score = _clamp(experience_part + delivery_part + rating_part)

    bits = [f"{years} yr experience", f"{completed} projects delivered"]
    if reviews:
        bits.append(f"{rating:.1f}★ from {reviews} review(s)")
    return round(score, 1), ", ".join(bits) + "."


# ---------------------------------------------------------------------------
# Component 5 — Availability (10%)
# ---------------------------------------------------------------------------
AVAILABILITY_SCORES = {"available": 100.0, "limited": 55.0, "busy": 20.0}


def score_availability(brief: Brief, creator: CreatorProfile) -> Tuple[float, str]:
    state = (creator.availability or "available").lower()
    score = AVAILABILITY_SCORES.get(state, 50.0)
    labels = {
        "available": "Available for new projects now.",
        "limited": "Limited availability — may take on one project.",
        "busy": "Currently booked; scheduling constraints likely.",
    }
    explanation = labels.get(state, "Availability unknown.")
    if state == "available":
        explanation += f" Typically responds within {creator.response_time_hours or 24}h."
    return score, explanation


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------
def match_creator(
    brief: Brief,
    creator: CreatorProfile,
    items: List[PortfolioItem],
    user_name: str = "",
    user_company: str | None = None,
) -> MatchResultOut:
    """Compute the full explainable match of one creator against one brief."""
    skill_score, skill_why = score_skills(brief, creator)
    portfolio_score, portfolio_why = score_portfolio(brief, creator, items)
    budget_score, budget_why = score_budget(brief, creator)
    experience_score, experience_why = score_experience(brief, creator)
    availability_score, availability_why = score_availability(brief, creator)

    raw = [
        ("skill", "Skill compatibility", skill_score, skill_why),
        ("portfolio", "Portfolio & style relevance", portfolio_score, portfolio_why),
        ("budget", "Budget compatibility", budget_score, budget_why),
        ("experience", "Experience & reviews", experience_score, experience_why),
        ("availability", "Availability", availability_score, availability_why),
    ]

    components: List[ScoreComponent] = []
    total = 0.0
    reasons: List[str] = []
    for key, label, score, why in raw:
        weight = WEIGHTS[key]
        earned = round(score * weight, 2)
        total += earned
        components.append(
            ScoreComponent(
                key=key,
                label=label,
                weight=weight,
                score=score,
                max_points=round(weight * 100, 2),
                earned_points=earned,
                explanation=why,
            )
        )
        if score >= 75:
            reasons.append(f"{label}: {why}")

    match_score = round(_clamp(total), 1)
    tier = (
        "Excellent match"
        if match_score >= 85
        else "Strong match"
        if match_score >= 72
        else "Good match"
        if match_score >= 60
        else "Fair match"
        if match_score >= 45
        else "Weak match"
    )
    if not reasons:
        reasons.append("Mixed fit across criteria — review the component breakdown below.")

    creator_out = serialize_creator_card(creator, items, user_name, user_company)
    return MatchResultOut(
        creator=creator_out,
        match_score=match_score,
        tier=tier,
        components=components,
        reasons=reasons,
    )


def rank_creators(
    brief: Brief,
    creators: List[Tuple[CreatorProfile, List[PortfolioItem], str, str | None]],
    limit: int = 20,
) -> List[MatchResultOut]:
    """Rank (creator, portfolio, user_name, company) tuples for a brief."""
    results = [
        match_creator(brief, creator, items, name, company)
        for creator, items, name, company in creators
    ]
    results.sort(key=lambda r: r.match_score, reverse=True)
    return results[:limit]


def serialize_creator_card(
    creator: CreatorProfile,
    items: List[PortfolioItem],
    user_name: str,
    user_company: str | None,
) -> CreatorCardOut:
    """Build the API-facing creator card payload (shared with listings)."""
    return CreatorCardOut(
        id=creator.id,
        user_id=creator.user_id,
        full_name=user_name,
        company=user_company,
        headline=creator.headline,
        bio=creator.bio,
        location=creator.location,
        specialties=creator.specialties or [],
        skills=creator.skills or [],
        ai_tools=creator.ai_tools or [],
        price_min=creator.price_min,
        price_max=creator.price_max,
        availability=creator.availability,
        experience_years=creator.experience_years,
        rating=creator.rating,
        review_count=creator.review_count,
        completed_projects=creator.completed_projects,
        response_time_hours=creator.response_time_hours,
        avatar_gradient=creator.avatar_gradient,
        portfolio=[PortfolioItemOut.model_validate(i) for i in items],
    )

    return score, explanation

