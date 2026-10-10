"""Auth endpoints: registration, login, current user."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import CreatorProfile, User
from schemas import AuthResponse, LoginInput, RegisterInput, UserOut
from security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterInput, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        company=(payload.company or "").strip() or None,
    )
    db.add(user)
    db.flush()

    if user.role == "creator":
        db.add(
            CreatorProfile(
                user_id=user.id,
                headline=f"{user.full_name} — AI creator",
                bio="New to CreatorAI. Add your bio, skills and portfolio to appear in matches.",
                location="Remote",
                specialties=[],
                skills=[],
                ai_tools=[],
            )
        )
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return AuthResponse(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
