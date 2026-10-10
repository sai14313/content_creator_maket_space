"""SQLAlchemy ORM models for CreatorAI."""
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base

# Full engagement workflow (order matters for the UI stepper).
WORKFLOW_STATUSES = [
    "invitation_sent",
    "proposal_submitted",
    "in_production",
    "in_review",
    "revision_requested",
    "approved",
    "delivered",
]

STATUS_LABELS = {
    "invitation_sent": "Invitation Sent",
    "proposal_submitted": "Proposal Submitted",
    "in_production": "In Production",
    "in_review": "In Review",
    "revision_requested": "Revision Requested",
    "approved": "Approved",
    "delivered": "Delivered",
    "declined": "Declined",
}


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(20), nullable=False, default="brand")  # brand | creator | admin
    company = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator_profile = relationship(
        "CreatorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    briefs = relationship("Brief", back_populates="brand", cascade="all, delete-orphan")


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    headline = Column(String(200), nullable=False, default="")
    bio = Column(Text, nullable=False, default="")
    location = Column(String(120), nullable=False, default="")
    specialties = Column(JSON, nullable=False, default=list)  # e.g. ["AI filmmaking"]
    skills = Column(JSON, nullable=False, default=list)
    ai_tools = Column(JSON, nullable=False, default=list)
    price_min = Column(Integer, nullable=False, default=500)
    price_max = Column(Integer, nullable=False, default=5000)
    availability = Column(String(20), nullable=False, default="available")  # available|limited|busy
    experience_years = Column(Integer, nullable=False, default=1)
    rating = Column(Float, nullable=False, default=0.0)
    review_count = Column(Integer, nullable=False, default=0)
    completed_projects = Column(Integer, nullable=False, default=0)
    response_time_hours = Column(Integer, nullable=False, default=24)
    avatar_gradient = Column(String(80), nullable=False, default="from-violet-500 to-indigo-600")

    user = relationship("User", back_populates="creator_profile")
    portfolio_items = relationship(
        "PortfolioItem", back_populates="creator", cascade="all, delete-orphan"
    )


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    title = Column(String(160), nullable=False)
    description = Column(Text, nullable=False, default="")
    category = Column(String(80), nullable=False)  # maps to content style / specialty
    tools_used = Column(JSON, nullable=False, default=list)
    style_tags = Column(JSON, nullable=False, default=list)
    gradient = Column(String(80), nullable=False, default="from-violet-500 to-indigo-600")
    emoji = Column(String(16), nullable=False, default="✨")
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("CreatorProfile", back_populates="portfolio_items")


class Brief(Base):
    __tablename__ = "briefs"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    objective = Column(Text, nullable=False, default="")
    audience = Column(String(255), nullable=False, default="")
    content_type = Column(String(80), nullable=False, default="")
    preferred_style = Column(String(120), nullable=False, default="")
    required_tools = Column(JSON, nullable=False, default=list)
    required_skills = Column(JSON, nullable=False, default=list)
    budget_min = Column(Integer, nullable=False, default=0)
    budget_max = Column(Integer, nullable=False, default=0)
    deadline = Column(String(20), nullable=False, default="")
    deliverables = Column(Text, nullable=False, default="")
    usage_rights = Column(String(120), nullable=False, default="3-month organic social")
    status = Column(String(20), nullable=False, default="draft")  # draft|published|closed
    created_at = Column(DateTime, default=datetime.utcnow)

    brand = relationship("User", back_populates="briefs")


class Project(Base):
    """An engagement between a brand and a creator, born from an invitation."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    brief_id = Column(Integer, ForeignKey("briefs.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    title = Column(String(200), nullable=False)
    status = Column(String(30), nullable=False, default="invitation_sent")
    agreed_budget = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    brief = relationship("Brief")
    brand = relationship("User", foreign_keys=[brand_id])
    creator = relationship("CreatorProfile", foreign_keys=[creator_id])
    events = relationship(
        "ProjectEvent", back_populates="project", cascade="all, delete-orphan",
        order_by="ProjectEvent.created_at",
    )
    milestones = relationship(
        "Milestone", back_populates="project", cascade="all, delete-orphan",
        order_by="Milestone.position",
    )
    deliverables = relationship(
        "Deliverable", back_populates="project", cascade="all, delete-orphan",
        order_by="Deliverable.created_at",
    )
    invitations = relationship("Invitation", back_populates="project", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="project", cascade="all, delete-orphan")
    review = relationship(
        "Review", back_populates="project", uselist=False, cascade="all, delete-orphan"
    )


class ProjectEvent(Base):
    __tablename__ = "project_events"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=False)
    note = Column(Text, nullable=False, default="")
    actor = Column(String(20), nullable=False, default="")  # brand|creator|system
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="events")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(200), nullable=False)
    due_date = Column(String(20), nullable=False, default="")
    status = Column(String(20), nullable=False, default="pending")  # pending|in_progress|completed
    position = Column(Integer, nullable=False, default=0)

    project = relationship("Project", back_populates="milestones")


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(200), nullable=False)
    file_name = Column(String(255), nullable=False)  # sanitized name on disk
    original_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="pending")  # pending|approved|revision_requested
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="deliverables")


class Shortlist(Base):
    __tablename__ = "shortlists"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    brief_id = Column(Integer, ForeignKey("briefs.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    message = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=False, default="sent")  # sent|accepted|declined
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="invitations")
    brief = relationship("Brief")
    creator = relationship("CreatorProfile")


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    brief_id = Column(Integer, ForeignKey("briefs.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    cover_letter = Column(Text, nullable=False, default="")
    proposed_budget = Column(Integer, nullable=False, default=0)
    timeline_days = Column(Integer, nullable=False, default=14)
    status = Column(String(20), nullable=False, default="submitted")  # submitted|accepted|rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="proposals")
    brief = relationship("Brief")
    creator = relationship("CreatorProfile")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    brand_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    rating = Column(Float, nullable=False, default=5.0)
    comment = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="review")
    creator = relationship("CreatorProfile")
