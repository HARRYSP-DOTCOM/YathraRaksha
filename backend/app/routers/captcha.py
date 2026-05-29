from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from jose import jwt
from pydantic import BaseModel, Field

from app.config import settings
from app.services.captcha_service import create_challenge, verify_challenge

router = APIRouter(prefix="/captcha", tags=["captcha"])


class CaptchaVerifyRequest(BaseModel):
    challengeId: str
    answer: str = Field(min_length=1, max_length=12)
    honeypot: str = ""


class CaptchaVerifyResponse(BaseModel):
    verified: bool
    token: str
    expiresIn: int
    message: str


@router.get("/challenge")
def get_challenge():
    return create_challenge()


@router.post("/verify", response_model=CaptchaVerifyResponse)
def verify_captcha(body: CaptchaVerifyRequest):
    if body.honeypot:
        raise HTTPException(status_code=400, detail="Verification failed")

    ok, msg = verify_challenge(body.challengeId, body.answer)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    expire = datetime.utcnow() + timedelta(seconds=settings.access_token_expire_seconds)
    token = jwt.encode(
        {"sub": "verified_citizen", "type": "captcha", "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    return CaptchaVerifyResponse(
        verified=True,
        token=token,
        expiresIn=settings.access_token_expire_seconds,
        message="Human verification successful",
    )
