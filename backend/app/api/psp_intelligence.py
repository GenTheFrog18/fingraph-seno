from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_central_investigator
from app.core.config import settings
from app.core.security import verify_psp_event_signature
from app.db.session import get_db
from app.models.qris_intelligence import CaseObservation, NetworkCase, QrisObservation
from app.models.user import User
from app.schemas.intelligence import CaseStatusUpdate, QrisObservationIngest
from app.services.audit import add_audit
from app.services.qris_intelligence import score_and_open_case, serialize_case


router = APIRouter(tags=["PSP Intelligence"])


def _parse_timestamp(value: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="X-FG-Timestamp tidak valid") from exc
    if parsed <= 0:
        raise HTTPException(status_code=401, detail="X-FG-Timestamp tidak valid")
    return parsed


@router.post("/psp/events", status_code=202)
async def ingest_psp_event(
    request: Request,
    x_fg_provider: str = Header(..., alias="X-FG-Provider"),
    x_fg_timestamp: str = Header(..., alias="X-FG-Timestamp"),
    x_fg_signature: str = Header(..., alias="X-FG-Signature"),
    db: Session = Depends(get_db),
):
    provider_id = x_fg_provider.strip().lower()
    send_timestamp = _parse_timestamp(x_fg_timestamp)
    raw_body = await request.body()
    if provider_id not in settings.psp_event_keys or not verify_psp_event_signature(provider_id, send_timestamp, raw_body, x_fg_signature):
        add_audit(
            db,
            action="reject_psp_event_signature",
            entity_type="qris_observation",
            entity_id=None,
            description="PSP event rejected because provider authentication or signature freshness failed.",
            actor=f"provider:{provider_id or 'unknown'}",
            metadata={"provider_id": provider_id, "body_hash": hashlib.sha256(raw_body).hexdigest()},
        )
        db.commit()
        raise HTTPException(status_code=401, detail="PSP event signature tidak valid")
    try:
        payload = QrisObservationIngest.model_validate(json.loads(raw_body))
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=422, detail="Payload PSP tidak valid") from exc
    if payload.acquirer_id != provider_id:
        raise HTTPException(status_code=422, detail="acquirer_id harus sama dengan provider terautentikasi")

    body_hash = hashlib.sha256(raw_body).hexdigest()
    existing = db.query(QrisObservation).filter(
        QrisObservation.source_provider_id == provider_id,
        QrisObservation.source_event_id == payload.source_event_id,
    ).first()
    if existing:
        if existing.raw_payload_hash != body_hash:
            raise HTTPException(status_code=409, detail="source_event_id sudah digunakan dengan payload berbeda")
        linked_case = db.query(CaseObservation).filter(CaseObservation.observation_id == existing.id).first()
        return {
            "observation_id": str(existing.id),
            "status": "already_seen",
            "received_at": existing.received_at.isoformat() + "Z",
            "scoring_status": existing.scoring_status,
            "case_id": str(linked_case.case_id) if linked_case else None,
        }
    payment_existing = db.query(QrisObservation).filter(
        QrisObservation.source_provider_id == provider_id,
        QrisObservation.source_payment_id == payload.source_payment_id,
    ).first()
    if payment_existing:
        raise HTTPException(status_code=409, detail="source_payment_id bereits akzeptiert")

    received_at = datetime.now(timezone.utc).replace(tzinfo=None)
    observation = QrisObservation(
        schema_version=payload.schema_version,
        source_provider_id=provider_id,
        source_event_id=payload.source_event_id,
        source_payment_id=payload.source_payment_id,
        event_type=payload.event_type,
        payment_method=payload.payment_method,
        occurred_at=payload.occurred_at.astimezone(timezone.utc).replace(tzinfo=None),
        received_at=received_at,
        amount_idr=payload.amount_idr,
        merchant_ref=payload.merchant_ref,
        acquirer_id=payload.acquirer_id,
        issuer_id=payload.issuer_id,
        payer_token=payload.payer_token,
        payer_token_scheme=payload.payer_token_scheme,
        qris_ref=payload.qris_ref,
        raw_payload_hash=body_hash,
        send_timestamp=send_timestamp,
        signature_key_id=provider_id,
    )
    db.add(observation)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        concurrent = db.query(QrisObservation).filter(
            QrisObservation.source_provider_id == provider_id,
            QrisObservation.source_event_id == payload.source_event_id,
        ).first()
        if concurrent and concurrent.raw_payload_hash == body_hash:
            return {
                "observation_id": str(concurrent.id),
                "status": "already_seen",
                "received_at": concurrent.received_at.isoformat() + "Z",
                "scoring_status": concurrent.scoring_status,
                "case_id": None,
            }
        raise HTTPException(status_code=409, detail="PSP event conflict") from exc

    scoring, case = score_and_open_case(db, observation)
    add_audit(
        db,
        action="accept_psp_observation",
        entity_type="qris_observation",
        entity_id=str(observation.id),
        description="Authenticated PSP observation accepted and scored post-event.",
        actor=f"provider:{provider_id}",
        metadata={"provider_id": provider_id, "case_id": str(case.id) if case else None, "scoring_status": observation.scoring_status},
    )
    db.commit()
    return {
        "observation_id": str(observation.id),
        "status": "accepted",
        "received_at": received_at.isoformat() + "Z",
        "scoring_status": observation.scoring_status,
        "score": scoring,
        "case_id": str(case.id) if case else None,
    }


def _case_query(db: Session):
    return db.query(NetworkCase)


def _get_case(db: Session, user: User, case_id: UUID) -> NetworkCase:
    query = _case_query(db)
    case = query.filter(NetworkCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case tidak ditemukan")
    return case


@router.get("/cases")
def list_cases(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(require_central_investigator),
    db: Session = Depends(get_db),
):
    query = _case_query(db)
    if status_filter:
        query = query.filter(NetworkCase.status == status_filter)
    cases = query.order_by(NetworkCase.updated_at.desc()).limit(limit).all()
    return {
        "items": [
            {
                "id": str(case.id),
                "case_type": case.case_type,
                "status": case.status,
                "risk_score": case.risk_score,
                "created_at": case.created_at.isoformat() + "Z",
                "updated_at": case.updated_at.isoformat() + "Z",
                "participants": (case.evidence or {}).get("participants", {}),
                "payer_link_count": (case.evidence or {}).get("payer_link_count", 0),
            }
            for case in cases
        ]
    }


@router.get("/cases/{case_id}")
def get_case(case_id: UUID, current_user: User = Depends(require_central_investigator), db: Session = Depends(get_db)):
    case = _get_case(db, current_user, case_id)
    return serialize_case(db, case)


@router.get("/cases/{case_id}/evidence")
def get_case_evidence(case_id: UUID, current_user: User = Depends(require_central_investigator), db: Session = Depends(get_db)):
    case = _get_case(db, current_user, case_id)
    payload = serialize_case(db, case)
    return {"case_id": str(case.id), "evidence": payload["evidence"], "observations": payload["observations"], "model_provenance": payload["model_provenance"]}


@router.get("/cases/{case_id}/graph")
def get_case_graph(case_id: UUID, current_user: User = Depends(require_central_investigator), db: Session = Depends(get_db)):
    case = _get_case(db, current_user, case_id)
    max_observations = max(1, settings.QRIS_CASE_GRAPH_MAX_OBSERVATIONS)
    observation_query = (
        db.query(QrisObservation)
        .join(CaseObservation, CaseObservation.observation_id == QrisObservation.id)
        .filter(CaseObservation.case_id == case.id)
        .order_by(QrisObservation.received_at.asc(), QrisObservation.id.asc())
    )
    total_observations = observation_query.count()
    observations = observation_query.limit(max_observations).all()

    payer_key = settings.PAYER_PSEUDONYM_KEY.encode() or b"qris-local-key"
    payer_aliases: dict[str, tuple[str, str]] = {}
    for observation in observations:
        if not observation.payer_token:
            continue
        qualified = f"{observation.issuer_id}|{observation.payer_token_scheme or 'unspecified'}|{observation.payer_token}"
        digest = hmac.new(payer_key, f"{case.id}:{qualified}".encode(), hashlib.sha256).hexdigest()[:24]
        payer_aliases.setdefault(digest, (qualified, f"Payer {chr(65 + len(payer_aliases))}"))

    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    for observation in observations:
        payment_id = f"payment:{observation.id}"
        merchant_id = f"merchant:{observation.source_provider_id}:{observation.merchant_ref}"
        nodes[payment_id] = {
            "id": payment_id,
            "label": "Payment",
            "entity_type": "payment",
            "provider": observation.source_provider_id,
            "amount_idr": observation.amount_idr,
            "reason": "Observation accepted from an authenticated PSP event",
        }
        nodes[merchant_id] = {
            "id": merchant_id,
            "label": f"Merchant {observation.merchant_ref}",
            "entity_type": "merchant",
            "provider": observation.source_provider_id,
            "merchant_ref": observation.merchant_ref,
            "reason": "Provider-namespaced merchant reference",
        }
        edges.append({
            "id": f"{payment_id}:merchant",
            "source": payment_id,
            "target": merchant_id,
            "label": "payment → merchant",
            "reason": "Same provider-namespaced merchant reference",
        })
        if observation.payer_token:
            qualified = f"{observation.issuer_id}|{observation.payer_token_scheme or 'unspecified'}|{observation.payer_token}"
            digest, alias = next((key, value[1]) for key, value in payer_aliases.items() if value[0] == qualified)
            payer_id = f"payer:{digest}"
            nodes[payer_id] = {
                "id": payer_id,
                "label": alias,
                "entity_type": "payer_link",
                "alias": alias,
                "reason": "Case-local HMAC alias for an issuer- and scheme-scoped payer link",
            }
            edges.append({
                "id": f"{payment_id}:payer:{digest}",
                "source": payment_id,
                "target": payer_id,
                "label": "shared payer link",
                "reason": "Same issuer- and scheme-scoped payer token within this case",
            })
    return {
        "case_id": str(case.id),
        "nodes": list(nodes.values()),
        "edges": edges,
        "privacy": "Payer identifiers are case-local HMAC aliases; raw payer tokens are never returned",
        "total_observations": total_observations,
        "returned_observations": len(observations),
        "truncated": total_observations > len(observations),
    }


@router.patch("/cases/{case_id}/status")
def update_case_status(
    case_id: UUID,
    payload: CaseStatusUpdate,
    current_user: User = Depends(require_central_investigator),
    db: Session = Depends(get_db),
):
    case = _get_case(db, current_user, case_id)
    old_status = case.status
    case.status = payload.status
    case.reviewer = current_user.email
    case.reviewer_decision = payload.status
    case.decision_reason = payload.reason
    add_audit(
        db,
        action="update_network_case_status",
        entity_type="network_case",
        entity_id=str(case.id),
        description=f"Network case changed from {old_status} to {payload.status}.",
        user=current_user,
        metadata={"reason": payload.reason},
    )
    db.commit()
    return serialize_case(db, case)
