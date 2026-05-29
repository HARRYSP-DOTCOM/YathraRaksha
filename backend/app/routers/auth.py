from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    new_user_id,
    user_to_schema,
    verify_password,
)
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import AuthResponse, LoginRequest, SignupRequest, TokenRefreshResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        id=new_user_id(),
        email=body.email.lower(),
        name=body.name,
        password_hash=hash_password(body.password),
        role="citizen",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(
        user=user_to_schema(user),
        token=token,
        expiresIn=settings.access_token_expire_seconds,
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    return AuthResponse(
        user=user_to_schema(user),
        token=token,
        expiresIn=settings.access_token_expire_seconds,
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(user: User | None = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    token = create_access_token(user.id)
    return TokenRefreshResponse(token=token, expiresIn=settings.access_token_expire_seconds)
