"""Pydantic schemas (request/response models) for CreatorAI."""
from datetime import datetime
from typing import Annotated, List, Literal, Optional

import email_validator
from pydantic import AfterValidator, BaseModel, ConfigDict, Field


def _normalize_email(v: str) -> str:
    """
    Validate + normalize an email WITHOUT DNS deliverability checks.

    The standard pydantic EmailStr performs live DNS lookups, which rejects
    reserved demo domains (e.g. `*.test`) and breaks offline environments.
    """
    try:
        try:
            result = email_validator.validate_email(
                v, check_deliverability=False, test_environment=True
            )
        except TypeError:  # older email-validator signatures
            result = email_validator.validate_email(v, check_deliverability=False)
    except email_validator.EmailNotValidError as exc:
        raise ValueError(str(exc)) from exc
    return result.normalized


EmailStr = Annotated[str, AfterValidator(_normalize_email)]

AvailabilityLiteral = Literal["available", "limited", "busy"]
RoleLiteral = Literal["brand", "creator"]



class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    role: RoleLiteral
    company: Optional[str] = Field(default=None, max_length=120)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: int
    email: str
    full_name: str
    role: str
    company: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# Creators
# ---------------------------------------------------------------------------
class PortfolioItemOut(ORMModel):
    id: int
    title: str
    description: str
    category: str
    tools_used: List[str]
    style_tags: List[str]
    gradient: str
    emoji: str


class PortfolioItemIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=1000)
    category: str = Field(min_length=2, max_length=80)
    tools_used: List[str] = Field(default_factory=list, max_length=12)
    style_tags: List[str] = Field(default_factory=list, max_length=12)
    gradient: str = Field(default="from-violet-500 to-indigo-600", max_length=80)
    emoji: str = Field(default="✨", max_length=8)


class CreatorProfileOut(ORMModel):
    id: int
    user_id: int
    headline: str
    bio: str
    location: str
    specialties: List[str]
    skills: List[str]
    ai_tools: List[str]
    price_min: int
    price_max: int
    availability: str
    experience_years: int
    rating: float
    review_count: int
    completed_projects: int
    response_time_hours: int
    avatar_gradient: str


class CreatorCardOut(BaseModel):
    """Creator data as shown on marketplace cards (includes identity info)."""

    id: int
    user_id: int
    full_name: str
    company: Optional[str] = None
    headline: str
    bio: str
    location: str
    specialties: List[str]
    skills: List[str]
    ai_tools: List[str]
    price_min: int
    price_max: int
    availability: str
    experience_years: int
    rating: float
    review_count: int
    completed_projects: int
    response_time_hours: int
    avatar_gradient: str
    portfolio: List[PortfolioItemOut] = []


class CreatorProfileUpdate(BaseModel):
    headline: Optional[str] = Field(default=None, max_length=200)
    bio: Optional[str] = Field(default=None, max_length=4000)
    location: Optional[str] = Field(default=None, max_length=120)
    specialties: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    ai_tools: Optional[List[str]] = None
    price_min: Optional[int] = Field(default=None, ge=0)
    price_max: Optional[int] = Field(default=None, ge=0)
    availability: Optional[AvailabilityLiteral] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=60)
    avatar_gradient: Optional[str] = Field(default=None, max_length=80)


# ---------------------------------------------------------------------------
# Briefs
# ---------------------------------------------------------------------------
class BriefBase(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    objective: str = Field(default="", max_length=2000)
    audience: str = Field(default="", max_length=255)
    content_type: str = Field(default="", max_length=80)
    preferred_style: str = Field(default="", max_length=120)
    required_tools: List[str] = Field(default_factory=list, max_length=12)
    required_skills: List[str] = Field(default_factory=list, max_length=12)
    budget_min: int = Field(default=0, ge=0)
    budget_max: int = Field(default=0, ge=0)
    deadline: str = Field(default="", max_length=20)
    deliverables: str = Field(default="", max_length=2000)
    usage_rights: str = Field(default="3-month organic social", max_length=120)


class BriefCreate(BriefBase):
    status: Literal["draft", "published"] = "draft"


class BriefUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    objective: Optional[str] = Field(default=None, max_length=2000)
    audience: Optional[str] = Field(default=None, max_length=255)
    content_type: Optional[str] = Field(default=None, max_length=80)
    preferred_style: Optional[str] = Field(default=None, max_length=120)
    required_tools: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    budget_min: Optional[int] = Field(default=None, ge=0)
    budget_max: Optional[int] = Field(default=None, ge=0)
    deadline: Optional[str] = Field(default=None, max_length=20)
    deliverables: Optional[str] = Field(default=None, max_length=2000)
    usage_rights: Optional[str] = Field(default=None, max_length=120)
    status: Optional[Literal["draft", "published", "closed"]] = None


class BriefOut(ORMModel):
    id: int
    brand_id: int
    title: str
    objective: str
    audience: str
    content_type: str
    preferred_style: str
    required_tools: List[str]
    required_skills: List[str]
    budget_min: int
    budget_max: int
    deadline: str
    deliverables: str
    usage_rights: str
    status: str
    created_at: datetime


class BriefGenerateInput(BaseModel):
    idea: str = Field(min_length=10, max_length=600, description="Short campaign idea")


class BriefGenerateOutput(BriefBase):
    """A structured brief produced by the template engine (LLM-ready)."""


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------
class ScoreComponent(BaseModel):
    key: str
    label: str
    weight: float
    score: float
    max_points: float
    earned_points: float
    explanation: str


class MatchResultOut(BaseModel):
    creator: CreatorCardOut
    match_score: float
    tier: str
    components: List[ScoreComponent]
    reasons: List[str]


class MatchResponse(BaseModel):
    brief: BriefOut
    algorithm: str
    weights: dict
    results: List[MatchResultOut]


# ---------------------------------------------------------------------------
# Shortlists
# ---------------------------------------------------------------------------
class ShortlistIn(BaseModel):
    creator_id: int


class ShortlistOut(BaseModel):
    creator: CreatorCardOut


# ---------------------------------------------------------------------------
# Invitations & proposals
# ---------------------------------------------------------------------------
class InvitationCreate(BaseModel):
    brief_id: int
    creator_id: int
    message: str = Field(default="", max_length=2000)


class InvitationOut(BaseModel):
    id: int
    brief_id: int
    brief_title: str
    project_id: int
    brand_id: int
    brand_name: str
    creator_id: int
    creator_name: str
    message: str
    status: str
    created_at: datetime


class InvitationRespond(BaseModel):
    action: Literal["accept", "decline"]


class ProposalCreate(BaseModel):
    project_id: int
    cover_letter: str = Field(min_length=20, max_length=4000)
    proposed_budget: int = Field(ge=0)
    timeline_days: int = Field(default=14, ge=1, le=365)


class ProposalOut(BaseModel):
    id: int
    project_id: int
    brief_id: int
    brief_title: str
    brand_id: int
    brand_name: str
    creator_id: int
    creator_name: str
    cover_letter: str
    proposed_budget: int
    timeline_days: int
    status: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
class ProjectEventOut(ORMModel):
    id: int
    from_status: Optional[str]
    to_status: str
    note: str
    actor: str
    created_at: datetime


class MilestoneOut(ORMModel):
    id: int
    title: str
    due_date: str
    status: str
    position: int


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    due_date: str = Field(default="", max_length=20)


class MilestoneUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    due_date: Optional[str] = Field(default=None, max_length=20)
    status: Optional[Literal["pending", "in_progress", "completed"]] = None


class DeliverableOut(ORMModel):
    id: int
    title: str
    original_name: str
    file_name: str
    file_size: int
    status: str
    notes: str
    created_at: datetime


class DeliverableReview(BaseModel):
    action: Literal["approve", "request_revision"]
    notes: str = Field(default="", max_length=2000)


class ProjectOut(BaseModel):
    id: int
    brief_id: int
    brief_title: str
    title: str
    status: str
    agreed_budget: int
    brand_id: int
    brand_name: str
    creator_id: int
    creator_name: str
    created_at: datetime
    updated_at: datetime


class ProjectDetailOut(ProjectOut):
    events: List[ProjectEventOut]
    milestones: List[MilestoneOut]
    deliverables: List[DeliverableOut]
    invitations: List[InvitationOut]
    proposals: List[ProposalOut]
    review: Optional[dict] = None


class StatusUpdate(BaseModel):
    status: str = Field(min_length=3, max_length=30)
    note: str = Field(default="", max_length=2000)


class ReviewCreate(BaseModel):
    rating: float = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)

