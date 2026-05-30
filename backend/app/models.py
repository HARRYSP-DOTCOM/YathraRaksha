from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Float, String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="citizen")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    complaints: Mapped[list["Complaint"]] = relationship(back_populates="user")


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    payload_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(64), default="Submitted")
    escalation_level: Mapped[int] = mapped_column(Integer, default=0)
    sla_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User | None"] = relationship(back_populates="complaints")


class Road(Base):
    __tablename__ = "roads"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    authority: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contractor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contractor_performance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sanctioned_budget: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spent_budget: Mapped[int | None] = mapped_column(Integer, nullable=True)
    funding_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    data_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "country": self.country,
            "authority": self.authority,
            "contractorName": self.contractor_name,
            "contractorPerformance": self.contractor_performance,
            "sanctionedBudget": self.sanctioned_budget,
            "spentBudget": self.spent_budget,
            "fundingSource": self.funding_source,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "sourceName": self.source_name,
            "sourceUrl": self.source_url,
            "sourceVerifiedAt": self.source_verified_at.isoformat() + "Z" if self.source_verified_at else None,
        }
