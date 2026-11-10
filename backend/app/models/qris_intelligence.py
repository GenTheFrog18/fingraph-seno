import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class QrisObservation(Base):
    __tablename__ = "qris_observations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schema_version: Mapped[str] = mapped_column(String(50), nullable=False, default="fingraph.qris.observation.v1")
    source_provider_id: Mapped[str] = mapped_column(String(80), nullable=False)
    source_event_id: Mapped[str] = mapped_column(String(120), nullable=False)
    source_payment_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, default="QRIS")
    occurred_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    amount_idr: Mapped[int] = mapped_column(BigInteger, nullable=False)
    merchant_ref: Mapped[str] = mapped_column(String(120), nullable=False)
    acquirer_id: Mapped[str] = mapped_column(String(80), nullable=False)
    issuer_id: Mapped[str] = mapped_column(String(80), nullable=False)
    payer_token: Mapped[str | None] = mapped_column(String(180), nullable=True)
    payer_token_scheme: Mapped[str | None] = mapped_column(String(80), nullable=True)
    qris_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    raw_payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    send_timestamp: Mapped[int] = mapped_column(BigInteger, nullable=False)
    signature_key_id: Mapped[str] = mapped_column(String(120), nullable=False)
    scoring_status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)
    gnn_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    graph_heuristic_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    case_links = relationship("CaseObservation", back_populates="observation", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("source_provider_id", "source_event_id", name="uq_qris_observation_provider_event"),
        UniqueConstraint("source_provider_id", "source_payment_id", name="uq_qris_observation_provider_payment"),
        Index("ix_qris_observations_received_at", "received_at"),
        Index("ix_qris_observations_provider_merchant_time", "source_provider_id", "merchant_ref", "received_at"),
        Index("ix_qris_observations_issuer_payer_time", "issuer_id", "payer_token", "received_at"),
    )


class NetworkCase(Base):
    __tablename__ = "network_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_type: Mapped[str] = mapped_column(String(80), nullable=False, default="coordinated_merchant_network")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="suspected", index=True)
    candidate_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    model_provenance: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    reviewer: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reviewer_decision: Mapped[str | None] = mapped_column(String(40), nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    observation_links = relationship("CaseObservation", back_populates="case", cascade="all, delete-orphan")


class CaseObservation(Base):
    __tablename__ = "case_observations"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("network_cases.id", ondelete="CASCADE"), primary_key=True)
    observation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("qris_observations.id", ondelete="CASCADE"), primary_key=True)
    evidence_reason: Mapped[str] = mapped_column(String(120), nullable=False, default="network_relationship")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("NetworkCase", back_populates="observation_links")
    observation = relationship("QrisObservation", back_populates="case_links")
