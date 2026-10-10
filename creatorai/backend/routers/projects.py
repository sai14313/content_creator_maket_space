"""Engagement workflow: invitations, proposals, projects, milestones, uploads."""
import os
import re
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import (
    STATUS_LABELS,
    WORKFLOW_STATUSES,
    Brief,
    CreatorProfile,
    Deliverable,
    Invitation,
    Milestone,
    PortfolioItem,
    Project,
    ProjectEvent,
    Proposal,
    Review,
    User,
)
from schemas import (
    InvitationCreate,
    InvitationOut,
    InvitationRespond,
    MilestoneCreate,
    MilestoneOut,
    MilestoneUpdate,
    ProposalCreate,
    ProposalOut,
    ProjectDetailOut,
    ProjectOut,
    ReviewCreate,
    StatusUpdate,
    DeliverableOut,
    DeliverableReview,
)
from security import get_current_user, require_roles

router = APIRouter(prefix="/api", tags=["workflow"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))          # backend/routers
BACKEND_DIR = os.path.dirname(BASE_DIR)                        # backend/
UPLOAD_DIR = os.environ.get("CREATORAI_UPLOADS") or os.path.join(BACKEND_DIR, "uploads")
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".mp4", ".mov", ".webm",
    ".pdf", ".txt", ".md", ".csv", ".json",
    ".zip", ".rar", ".7z",
    ".glb", ".gltf", ".obj", ".fbx",
    ".psd", ".ai", ".aep", ".prproj",
}

# Allowed project status transitions (workflow engine).
TRANSITIONS = {
    "invitation_sent": {"proposal_submitted", "declined"},
    "proposal_submitted": {"in_production", "declined"},
    "in_production": {"in_review"},
    "in_review": {"revision_requested", "approved"},
    "revision_requested": {"in_production"},
    "approved": {"delivered"},
    "delivered": set(),
    "declined": set(),
}

# Which roles may trigger each transition.
TRANSITION_ROLES = {
    ("invitation_sent", "proposal_submitted"): {"creator"},
    ("invitation_sent", "declined"): {"creator", "brand"},
    ("proposal_submitted", "in_production"): {"brand"},
    ("proposal_submitted", "declined"): {"brand"},
    ("in_production", "in_review"): {"creator"},
    ("in_review", "revision_requested"): {"brand"},
    ("in_review", "approved"): {"brand"},
    ("revision_requested", "in_production"): {"creator"},
    ("approved", "delivered"): {"brand"},
}


def _get_project(db: Session, project_id: int, user: User) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    if user.role == "brand" and project.brand_id != user.id:
        raise HTTPException(status_code=403, detail="This project belongs to another brand.")
    if user.role == "creator" and project.creator_id != user.creator_profile.id:
        raise HTTPException(status_code=403, detail="This project belongs to another creator.")
    return project


def _log_event(
    db: Session,
    project: Project,
    to_status: str,
    note: str,
    actor: str,
    from_status: str | None = None,
) -> None:
    db.add(
        ProjectEvent(
            project_id=project.id,
            from_status=from_status if from_status is not None else project.status,
            to_status=to_status,
            note=note,
            actor=actor,
        )
    )


def _invitation_out(db: Session, inv: Invitation) -> InvitationOut:
    brief = db.get(Brief, inv.brief_id)
    brand = db.get(User, inv.brand_id)
    creator = db.get(CreatorProfile, inv.creator_id)
    creator_user = db.get(User, creator.user_id)
    return InvitationOut(
        id=inv.id,
        brief_id=inv.brief_id,
        brief_title=brief.title if brief else "",
        project_id=inv.project_id,
        brand_id=inv.brand_id,
        brand_name=brand.full_name if brand else "",
        creator_id=inv.creator_id,
        creator_name=creator_user.full_name if creator_user else "",
        message=inv.message,
        status=inv.status,
        created_at=inv.created_at,
    )


def _proposal_out(db: Session, prop: Proposal) -> ProposalOut:
    brief = db.get(Brief, prop.brief_id)
    brand = db.get(User, prop.brand_id)
    creator = db.get(CreatorProfile, prop.creator_id)
    creator_user = db.get(User, creator.user_id)
    return ProposalOut(
        id=prop.id,
        project_id=prop.project_id,
        brief_id=prop.brief_id,
        brief_title=brief.title if brief else "",
        brand_id=prop.brand_id,
        brand_name=brand.full_name if brand else "",
        creator_id=prop.creator_id,
        creator_name=creator_user.full_name if creator_user else "",
        cover_letter=prop.cover_letter,
        proposed_budget=prop.proposed_budget,
        timeline_days=prop.timeline_days,
        status=prop.status,
        created_at=prop.created_at,
    )


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------
@router.post("/invitations", response_model=InvitationOut, status_code=201)
def create_invitation(
    payload: InvitationCreate,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    """Brand invites a creator to a brief — creates the project at 'invitation_sent'."""
    brief = db.get(Brief, payload.brief_id)
    if brief is None or brief.brand_id != user.id:
        raise HTTPException(status_code=404, detail="Brief not found or not yours.")
    if brief.status != "published":
        raise HTTPException(status_code=400, detail="Publish the brief before inviting creators.")
    profile = db.get(CreatorProfile, payload.creator_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Creator not found.")

    already = (
        db.query(Invitation)
        .join(Project, Invitation.project_id == Project.id)
        .filter(
            Project.brief_id == brief.id,
            Project.creator_id == profile.id,
            Project.status.notin_(("declined",)),
        )
        .first()
    )
    if already:
        raise HTTPException(
            status_code=409, detail="This creator was already invited to the brief."
        )

    project = Project(
        brief_id=brief.id,
        brand_id=user.id,
        creator_id=profile.id,
        title=brief.title,
        status="invitation_sent",
        agreed_budget=brief.budget_max or 0,
    )
    db.add(project)
    db.flush()
    _log_event(
        db, project, "invitation_sent", "Invitation sent to creator.", "brand", from_status=None
    )
    invitation = Invitation(
        project_id=project.id,
        brief_id=brief.id,
        brand_id=user.id,
        creator_id=profile.id,
        message=payload.message,
        status="sent",
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return _invitation_out(db, invitation)


@router.get("/invitations", response_model=List[InvitationOut])
def list_invitations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Invitation)
    if user.role == "brand":
        q = q.filter(Invitation.brand_id == user.id)
    elif user.role == "creator":
        q = q.filter(Invitation.creator_id == user.creator_profile.id)
    else:
        raise HTTPException(status_code=403, detail="Unsupported role.")
    rows = q.order_by(Invitation.created_at.desc()).all()
    return [_invitation_out(db, i) for i in rows]



@router.post("/invitations/{invitation_id}/respond", response_model=InvitationOut)
def respond_invitation(
    invitation_id: int,
    payload: InvitationRespond,
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    inv = db.get(Invitation, invitation_id)
    if inv is None or inv.creator_id != user.creator_profile.id:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    if inv.status != "sent":
        raise HTTPException(status_code=400, detail="This invitation was already answered.")
    project = db.get(Project, inv.project_id)

    if payload.action == "accept":
        inv.status = "accepted"
        _log_event(db, project, project.status, "Invitation accepted by creator.", "creator")
    else:
        inv.status = "declined"
        _log_event(
            db, project, "declined", "Invitation declined by creator.", "creator",
            from_status=project.status,
        )
        project.status = "declined"
    db.commit()
    db.refresh(inv)
    return _invitation_out(db, inv)


# ---------------------------------------------------------------------------
# Proposals
# ---------------------------------------------------------------------------
@router.post("/proposals", response_model=ProposalOut, status_code=201)
def create_proposal(
    payload: ProposalCreate,
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    """Creator submits a proposal for one of their invited projects."""
    project = db.get(Project, payload.project_id)
    if project is None or project.creator_id != user.creator_profile.id:
        raise HTTPException(status_code=404, detail="Project not found or not yours.")
    if project.status != "invitation_sent":
        label = STATUS_LABELS.get(project.status, project.status)
        raise HTTPException(
            status_code=400,
            detail=f"Project is at '{label}'; a proposal can only follow a fresh invitation.",
        )
    existing = db.query(Proposal).filter(Proposal.project_id == project.id).first()
    if existing:
        raise HTTPException(
            status_code=409, detail="A proposal was already submitted for this project."
        )

    proposal = Proposal(
        project_id=project.id,
        brief_id=project.brief_id,
        brand_id=project.brand_id,
        creator_id=project.creator_id,
        cover_letter=payload.cover_letter,
        proposed_budget=payload.proposed_budget,
        timeline_days=payload.timeline_days,
        status="submitted",
    )
    db.add(proposal)
    from_status = project.status
    project.status = "proposal_submitted"
    project.agreed_budget = payload.proposed_budget
    _log_event(
        db, project, "proposal_submitted", "Proposal submitted by creator.", "creator",
        from_status=from_status,
    )
    db.commit()
    db.refresh(proposal)
    return _proposal_out(db, proposal)


@router.get("/proposals", response_model=List[ProposalOut])
def list_proposals(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Proposal)
    if user.role == "brand":
        q = q.filter(Proposal.brand_id == user.id)
    elif user.role == "creator":
        q = q.filter(Proposal.creator_id == user.creator_profile.id)
    else:
        raise HTTPException(status_code=403, detail="Unsupported role.")
    rows = q.order_by(Proposal.created_at.desc()).all()
    return [_proposal_out(db, p) for p in rows]


@router.post("/proposals/{proposal_id}/decision", response_model=ProposalOut)
def decide_proposal(
    proposal_id: int,
    payload: InvitationRespond,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    """Brand accepts (→ In Production) or rejects a proposal."""
    proposal = db.get(Proposal, proposal_id)
    if proposal is None or proposal.brand_id != user.id:
        raise HTTPException(status_code=404, detail="Proposal not found.")
    if proposal.status != "submitted":
        raise HTTPException(status_code=400, detail="This proposal was already decided.")
    project = db.get(Project, proposal.project_id)

    if payload.action == "accept":
        proposal.status = "accepted"
        from_status = project.status
        project.status = "in_production"
        project.agreed_budget = proposal.proposed_budget
        _log_event(
            db, project, "in_production",
            f"Proposal accepted — project starts at ${proposal.proposed_budget:,} "
            f"over {proposal.timeline_days} days.",
            "brand", from_status=from_status,
        )
    else:
        proposal.status = "rejected"
        _log_event(db, project, project.status, "Proposal rejected by brand.", "brand")
    db.commit()
    db.refresh(proposal)
    return _proposal_out(db, proposal)



# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
def _project_out(db: Session, project: Project) -> ProjectOut:
    brief = db.get(Brief, project.brief_id)
    brand = db.get(User, project.brand_id)
    creator = db.get(CreatorProfile, project.creator_id)
    creator_user = db.get(User, creator.user_id)
    return ProjectOut(
        id=project.id,
        brief_id=project.brief_id,
        brief_title=brief.title if brief else "",
        title=project.title,
        status=project.status,
        agreed_budget=project.agreed_budget,
        brand_id=project.brand_id,
        brand_name=brand.full_name if brand else "",
        creator_id=project.creator_id,
        creator_name=creator_user.full_name if creator_user else "",
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("/projects", response_model=List[ProjectOut])
def list_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str | None = None,
):
    q = db.query(Project)
    if user.role == "brand":
        q = q.filter(Project.brand_id == user.id)
    elif user.role == "creator":
        q = q.filter(Project.creator_id == user.creator_profile.id)
    else:
        raise HTTPException(status_code=403, detail="Unsupported role.")
    if status:
        q = q.filter(Project.status == status)
    rows = q.order_by(Project.updated_at.desc()).all()
    return [_project_out(db, p) for p in rows]


@router.get("/projects/{project_id}", response_model=ProjectDetailOut)
def project_detail(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_project(db, project_id, user)
    base = _project_out(db, project)

    invitations = db.query(Invitation).filter(Invitation.project_id == project.id).all()
    proposals = db.query(Proposal).filter(Proposal.project_id == project.id).all()
    review = db.query(Review).filter(Review.project_id == project.id).first()

    return ProjectDetailOut(
        **base.model_dump(),
        events=[
            {
                "id": e.id,
                "from_status": e.from_status,
                "to_status": e.to_status,
                "note": e.note,
                "actor": e.actor,
                "created_at": e.created_at,
            }
            for e in project.events
        ],
        milestones=[MilestoneOut.model_validate(m) for m in project.milestones],
        deliverables=[DeliverableOut.model_validate(d) for d in project.deliverables],
        invitations=[_invitation_out(db, i) for i in invitations],
        proposals=[_proposal_out(db, p) for p in proposals],
        review=(
            {
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at.isoformat(),
            }
            if review
            else None
        ),
    )


@router.post("/projects/{project_id}/status", response_model=ProjectDetailOut)
def update_status(
    project_id: int,
    payload: StatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Advance the workflow with role-checked, validated transitions."""
    project = _get_project(db, project_id, user)

    if payload.status == project.status:
        raise HTTPException(status_code=400, detail="Project is already in that status.")
    allowed = TRANSITIONS.get(project.status, set())
    if payload.status not in allowed:
        allowed_labels = ", ".join(
            STATUS_LABELS.get(s, s) for s in sorted(allowed)
        ) or "nothing (terminal state)"
        raise HTTPException(
            status_code=400,
            detail=f"Cannot go from '{STATUS_LABELS.get(project.status, project.status)}' to "
                   f"'{STATUS_LABELS.get(payload.status, payload.status)}'. Allowed: {allowed_labels}.",
        )
    allowed_roles = TRANSITION_ROLES.get((project.status, payload.status), set())
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Your role cannot trigger this transition.",
        )

    from_status = project.status
    project.status = payload.status
    _log_event(
        db, project, payload.status, payload.note or "Status updated.", user.role,
        from_status=from_status,
    )
    db.commit()
    db.refresh(project)
    return project_detail(project_id, user=user, db=db)



# ---------------------------------------------------------------------------
# Milestones
# ---------------------------------------------------------------------------
@router.post("/projects/{project_id}/milestones", response_model=MilestoneOut, status_code=201)
def add_milestone(
    project_id: int,
    payload: MilestoneCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_project(db, project_id, user)
    position = len(project.milestones)
    milestone = Milestone(
        project_id=project.id,
        title=payload.title,
        due_date=payload.due_date,
        position=position,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return MilestoneOut.model_validate(milestone)


@router.patch("/milestones/{milestone_id}", response_model=MilestoneOut)
def update_milestone(
    milestone_id: int,
    payload: MilestoneUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found.")
    _get_project(db, milestone.project_id, user)  # ownership check
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    db.commit()
    db.refresh(milestone)
    return MilestoneOut.model_validate(milestone)


@router.delete("/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    milestone_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(status_code=404, detail="Milestone not found.")
    _get_project(db, milestone.project_id, user)
    db.delete(milestone)
    db.commit()


# ---------------------------------------------------------------------------
# Deliverables (safe file upload)
# ---------------------------------------------------------------------------
def _safe_filename(original: str) -> str:
    """Strip any path components and prefixes with a UUID to avoid collisions/overwrite."""
    base = os.path.basename(original).replace("\\", "/").split("/")[-1]
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base) or "file"
    stem, ext = os.path.splitext(base)
    ext = ext.lower()
    return f"{uuid.uuid4().hex[:12]}_{stem[:60]}{ext}"


@router.post("/projects/{project_id}/deliverables", response_model=DeliverableOut, status_code=201)
async def upload_deliverable(
    project_id: int,
    title: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(require_roles("creator")),
    db: Session = Depends(get_db),
):
    """Creator uploads a deliverable file (validated extension + size limits)."""
    project = _get_project(db, project_id, user)
    if project.status in ("declined", "delivered"):
        raise HTTPException(status_code=400, detail="Project is closed for uploads.")

    original = file.filename or "upload.bin"
    ext = os.path.splitext(original)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{ext or 'unknown'}' not allowed. Allowed: "
                   f"{', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 25 MB upload limit.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    stored_name = _safe_filename(original)
    with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as fh:
        fh.write(content)

    deliverable = Deliverable(
        project_id=project.id,
        title=title.strip()[:200],
        file_name=stored_name,
        original_name=original[:255],
        file_size=len(content),
        status="pending",
    )
    db.add(deliverable)
    db.commit()
    db.refresh(deliverable)
    return DeliverableOut.model_validate(deliverable)



@router.post("/deliverables/{deliverable_id}/review", response_model=DeliverableOut)
def review_deliverable(
    deliverable_id: int,
    payload: DeliverableReview,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    """Brand approves a deliverable or requests a revision (with notes)."""
    deliverable = db.get(Deliverable, deliverable_id)
    if deliverable is None:
        raise HTTPException(status_code=404, detail="Deliverable not found.")
    project = db.get(Project, deliverable.project_id)
    if project is None or project.brand_id != user.id:
        raise HTTPException(status_code=403, detail="This deliverable belongs to another brand.")

    deliverable.status = "approved" if payload.action == "approve" else "revision_requested"
    deliverable.notes = payload.notes
    _log_event(
        db, project, project.status,
        f"Deliverable '{deliverable.title}': "
        + ("approved." if payload.action == "approve" else f"revision requested. {payload.notes}".strip()),
        "brand",
    )
    db.commit()
    db.refresh(deliverable)
    return DeliverableOut.model_validate(deliverable)


@router.get("/files/{file_name}")
def download_file(file_name: str, db: Session = Depends(get_db)):
    """Serve an uploaded deliverable; validates the stored name (no path traversal)."""
    from fastapi.responses import FileResponse

    safe = os.path.basename(file_name)
    if not re.fullmatch(r"[A-Za-z0-9._-]+", safe):
        raise HTTPException(status_code=400, detail="Invalid file name.")
    row = db.query(Deliverable).filter(Deliverable.file_name == safe).first()
    if row is None:
        raise HTTPException(status_code=404, detail="File not found.")
    path = os.path.join(UPLOAD_DIR, safe)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File missing on disk.")
    return FileResponse(path, filename=row.original_name)


# ---------------------------------------------------------------------------
# Project review (brand, after delivery)
# ---------------------------------------------------------------------------
@router.post("/projects/{project_id}/review", status_code=201)
def create_review(
    project_id: int,
    payload: ReviewCreate,
    user: User = Depends(require_roles("brand")),
    db: Session = Depends(get_db),
):
    project = _get_project(db, project_id, user)
    if project.status != "delivered":
        raise HTTPException(status_code=400, detail="Reviews can only be left after delivery.")
    if db.query(Review).filter(Review.project_id == project.id).first():
        raise HTTPException(status_code=409, detail="This project already has a review.")

    review = Review(
        project_id=project.id,
        brand_id=user.id,
        creator_id=project.creator_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    _log_event(db, project, "delivered", "Brand left a review.", "brand")

    # Update the creator's aggregate rating, treating stored stats as the
    # historical baseline so seeded/demo statistics are preserved.
    creator = db.get(CreatorProfile, project.creator_id)
    prior_count = creator.review_count or 0
    prior_total = (creator.rating or 0.0) * prior_count
    creator.review_count = prior_count + 1
    creator.rating = round((prior_total + payload.rating) / creator.review_count, 2)
    creator.completed_projects = (creator.completed_projects or 0) + 1
    db.commit()
    db.refresh(review)
    return {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "creator_rating": creator.rating,
        "review_count": creator.review_count,
    }

