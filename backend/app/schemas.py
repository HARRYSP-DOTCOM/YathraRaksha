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

class RepairVerificationRequest(BaseModel):
    afterImageUrl: str
    notes: str | None = None


# ── AI Two-Stage Road Validation Schemas ──

class RoadValidationResult(BaseModel):
    """Stage 1 output — road scene validation."""
    isRoadScene: bool
    confidence: float = Field(ge=0.0, le=1.0)
    detectedObjects: list[str] = []
    reason: str


class AnalysisRejection(BaseModel):
    """Returned when an image fails road scene validation."""
    success: bool = False
    error: str
    roadConfidence: float = Field(ge=0.0, le=1.0)
    detectedObjects: list[str] = []
    reason: str


class DefectReport(BaseModel):
    """Returned on successful road validation + defect analysis."""
    success: bool = True
    timestamp: str
    roadValidationConfidence: float = Field(ge=0.0, le=1.0)
    roadValidationObjects: list[str] = []
    defectType: str
    severity: str
    aiConfidence: str
    defectArea: str
    estimatedDepth: str
    urgencyScore: float
    repairBudgetEstimate: str
    coordinates: list[float]
    matchedRoad: Any | None = None
    distanceToRoadKm: float | None = None
    integrityVerificationId: str
