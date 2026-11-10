from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class QrisObservationIngest(BaseModel):
    schema_version: Literal["fingraph.qris.observation.v1"]
    source_event_id: str = Field(min_length=1, max_length=120)
    source_payment_id: str = Field(min_length=1, max_length=120)
    event_type: Literal["payment.succeeded"]
    occurred_at: datetime
    payment_method: Literal["QRIS"]
    amount_idr: int = Field(gt=0, le=10_000_000_000_000)
    merchant_ref: str = Field(min_length=1, max_length=120)
    acquirer_id: str = Field(min_length=1, max_length=80)
    issuer_id: str = Field(min_length=1, max_length=80)
    payer_token: str | None = Field(default=None, min_length=1, max_length=180)
    payer_token_scheme: str | None = Field(default=None, min_length=1, max_length=80)
    qris_ref: str | None = Field(default=None, min_length=1, max_length=120)

    @field_validator("occurred_at")
    @classmethod
    def require_utc_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("occurred_at must include an RFC3339 timezone")
        return value.astimezone(timezone.utc)

    @field_validator("source_event_id", "source_payment_id", "merchant_ref", "acquirer_id", "issuer_id")
    @classmethod
    def reject_whitespace_only(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("identifier must not be empty")
        return value


class CaseStatusUpdate(BaseModel):
    status: Literal["suspected", "under_review", "dismissed"]
    reason: str | None = Field(default=None, max_length=1000)


class ObservationResponse(BaseModel):
    observation_id: UUID
    status: Literal["accepted", "already_seen"]
    received_at: datetime
    scoring_status: str
    case_id: UUID | None = None
