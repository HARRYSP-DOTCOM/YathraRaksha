from typing import Any

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    createdAt: str


class AuthResponse(BaseModel):
    user: UserOut
    token: str
    expiresIn: int = 86400


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    name: str = Field(min_length=1)


class TokenRefreshResponse(BaseModel):
    token: str
    expiresIn: int = 86400


class ComplaintStatusUpdate(BaseModel):
    status: str
    message: str | None = None


class MediaUploadResponse(BaseModel):
    url: str
    filename: str
    complaintId: str | None = None
