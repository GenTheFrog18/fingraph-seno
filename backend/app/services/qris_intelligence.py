from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml.graph.inference import score_observation
from app.models.qris_intelligence import CaseObservation, NetworkCase, QrisObservation
from app.services.audit import add_audit


def utc_naive(value: datetime) -> datetime:
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value


def _payer_key(observation: QrisObservation) -> tuple[str, str, str] | None:
    if not observation.payer_token:
        return None
    return observation.issuer_id, observation.payer_token_scheme or "unspecified", observation.payer_token


def _merchant_key(observation: QrisObservation) -> str:
    return f"{observation.source_provider_id}:{observation.merchant_ref}"


def _window_rows(db: Session, observation: QrisObservation) -> list[QrisObservation]:
    end = utc_naive(observation.received_at)
    start = end - timedelta(seconds=settings.QRIS_OBSERVATION_WINDOW_SECONDS)
    cap = max(1, settings.QRIS_GNN_MAX_NODES)
    newest = (
        db.query(QrisObservation)
        .filter(
            QrisObservation.received_at >= start,
            QrisObservation.received_at <= end,
            QrisObservation.id != observation.id,
        )
        .order_by(QrisObservation.received_at.desc(), QrisObservation.id.desc())
        .limit(max(cap - 1, 0))
        .all()
    )
    rows = [*newest, observation]
    return sorted(rows, key=lambda row: (utc_naive(row.received_at), str(row.id)))


def graph_heuristic_score(db: Session, observation: QrisObservation) -> tuple[float, dict[str, Any]]:
    rows = _window_rows(db, observation)
    payer = _payer_key(observation)
    linked = [row for row in rows if payer and _payer_key(row) == payer]
    merchants = {_merchant_key(row) for row in linked}
    acquirers = {row.acquirer_id for row in linked}
    score = min(0.99, 0.04 + min(len(linked), 20) * 0.01 + min(len(merchants), 5) * 0.08 + min(len(acquirers), 3) * 0.12)
    return round(score, 4), {
        "linked_observations": len(linked),
        "connected_merchants": len(merchants),
        "connected_acquirers": len(acquirers),
        "payer_link_available": payer is not None,
    }


def _component(rows: list[QrisObservation], target: QrisObservation) -> list[QrisObservation]:
    target_payer = _payer_key(target)
    if not target_payer:
        return []
    component = {target.id}
    payer_keys = {target_payer}
    merchant_keys = {_merchant_key(target)}
    changed = True
    while changed:
        changed = False
        for row in rows:
            if row.id in component:
                continue
            payer_key = _payer_key(row)
            if _merchant_key(row) in merchant_keys or (payer_key and payer_key in payer_keys):
                component.add(row.id)
                merchant_keys.add(_merchant_key(row))
                if payer_key:
                    payer_keys.add(payer_key)
                changed = True
    return [row for row in rows if row.id in component]


def _candidate(component: list[QrisObservation]) -> dict[str, Any] | None:
    merchants = sorted({_merchant_key(row) for row in component})
    acquirers = sorted({row.acquirer_id for row in component})
    providers = sorted({row.source_provider_id for row in component})
    payer_keys = sorted({key for row in component if (key := _payer_key(row))})
    if len(merchants) < 3 or len(acquirers) < 3 or len(payer_keys) < 2:
        return None
    pseudonym_key = settings.PAYER_PSEUDONYM_KEY.encode() or b"qris-local-key"
    payer_digests = [
        hmac.new(pseudonym_key, "|".join(key).encode(), hashlib.sha256).hexdigest()[:16]
        for key in payer_keys
    ]
    fingerprint_payload = {"merchants": merchants, "acquirers": acquirers, "payers": payer_digests}
    fingerprint = hashlib.sha256(json.dumps(fingerprint_payload, sort_keys=True).encode()).hexdigest()
    return {
        "fingerprint": fingerprint,
        "merchants": merchants,
        "acquirers": acquirers,
        "providers": providers,
        "payer_link_count": len(payer_keys),
        "payer_link_digests": payer_digests,
        "observation_ids": [str(row.id) for row in component],
        "window_start": min(row.received_at for row in component).isoformat() + "Z",
        "window_end": max(row.received_at for row in component).isoformat() + "Z",
    }


def _find_existing_case(db: Session, candidate: dict[str, Any]) -> NetworkCase | None:
    exact = db.query(NetworkCase).filter(NetworkCase.candidate_fingerprint == candidate["fingerprint"]).first()
    if exact:
        return exact

    merchant_set = set(candidate["merchants"])
    acquirer_set = set(candidate["acquirers"])
    payer_set = set(candidate["payer_link_digests"])
    cases = db.query(NetworkCase).filter(NetworkCase.status.in_(["suspected", "under_review"])).all()
    for case in cases:
        participants = (case.evidence or {}).get("participants", {})
        evidence_payers = set((case.evidence or {}).get("payer_link_digests", []))
        if (
            set(participants.get("merchants", [])) <= merchant_set
            and set(participants.get("acquirers", [])) <= acquirer_set
            and evidence_payers <= payer_set
        ):
            return case
    return None


def _case_signal(gnn: dict[str, Any], heuristic_score: float) -> tuple[float, dict[str, Any]]:
    if gnn.get("status") == "complete" and gnn.get("score") is not None:
        score = round(0.6 * float(gnn["score"]) + 0.4 * heuristic_score, 4)
    else:
        score = heuristic_score
    return score, {"gnn": gnn, "graph_heuristic": heuristic_score, "score_semantics": "investigative_priority_not_crime_probability"}


def score_and_open_case(db: Session, observation: QrisObservation) -> tuple[dict[str, Any], NetworkCase | None]:
    gnn = score_observation(db, observation)
    heuristic, heuristic_features = graph_heuristic_score(db, observation)
    observation.gnn_score = gnn.get("score") if gnn.get("status") == "complete" else None
    observation.graph_heuristic_score = heuristic
    observation.score_metadata = {"gnn": gnn, "graph_heuristic": heuristic_features}
    observation.scoring_status = "complete" if gnn.get("status") == "complete" else "fallback"

    candidate = _candidate(_component(_window_rows(db, observation), observation))
    case = None
    if candidate:
        risk_score, provenance = _case_signal(gnn, heuristic)
        if risk_score >= 0.40:
            case = _find_existing_case(db, candidate)
            evidence = {
                "participants": {key: candidate[key] for key in ("merchants", "acquirers", "providers")},
                "payer_link_count": candidate["payer_link_count"],
                "payer_link_digests": candidate["payer_link_digests"],
                "observation_ids": candidate["observation_ids"],
                "window": {"start": candidate["window_start"], "end": candidate["window_end"]},
                "topology_policy": "at_least_3_merchants_3_acquirers_2_issuer_scoped_payer_links",
            }
            if case is None:
                case = NetworkCase(
                    case_type="coordinated_merchant_network",
                    status="suspected",
                    candidate_fingerprint=candidate["fingerprint"],
                    risk_score=risk_score,
                    model_provenance=provenance,
                    evidence=evidence,
                )
                db.add(case)
                db.flush()
            else:
                if case.status == "dismissed":
                    previous = {
                        "status": case.status,
                        "reviewer": case.reviewer,
                        "reviewer_decision": case.reviewer_decision,
                        "decision_reason": case.decision_reason,
                    }
                    add_audit(
                        db,
                        action="reopen_network_case",
                        entity_type="network_case",
                        entity_id=str(case.id),
                        description="New matching evidence reopened a previously dismissed network case.",
                        actor="system:qris",
                        metadata={"previous_review": previous, "reason": "new_matching_observation"},
                    )
                    case.status = "suspected"
                    case.reviewer = None
                    case.reviewer_decision = None
                    case.decision_reason = None
                case.risk_score = max(case.risk_score, risk_score)
                case.model_provenance = provenance
                case.evidence = evidence
                case.candidate_fingerprint = candidate["fingerprint"]
            existing_ids = {link.observation_id for link in case.observation_links}
            for observation_id in candidate["observation_ids"]:
                observation_uuid = UUID(observation_id)
                if observation_uuid not in existing_ids:
                    db.add(CaseObservation(case_id=case.id, observation_id=observation_uuid, evidence_reason="cross_acquirer_payer_overlap"))

    return {"gnn": gnn, "graph_heuristic": {"score": heuristic, "features": heuristic_features}, "case_id": str(case.id) if case else None}, case


def serialize_observation(observation: QrisObservation, *, include_payer: bool = False) -> dict[str, Any]:
    return {
        "id": str(observation.id),
        "source_provider_id": observation.source_provider_id,
        "source_event_id": observation.source_event_id,
        "source_payment_id": observation.source_payment_id,
        "event_type": observation.event_type,
        "payment_method": observation.payment_method,
        "occurred_at": observation.occurred_at.isoformat() + "Z",
        "received_at": observation.received_at.isoformat() + "Z",
        "amount_idr": observation.amount_idr,
        "merchant_ref": observation.merchant_ref,
        "acquirer_id": observation.acquirer_id,
        "issuer_id": observation.issuer_id,
        "payer_token": observation.payer_token if include_payer else None,
        "payer_link_available": observation.payer_token is not None,
        "qris_ref": observation.qris_ref,
        "scoring_status": observation.scoring_status,
        "gnn_score": observation.gnn_score,
        "graph_heuristic_score": observation.graph_heuristic_score,
        "score_metadata": observation.score_metadata,
    }


def serialize_case(
    db: Session,
    case: NetworkCase,
    *,
    include_payer: bool = False,
    provider_scope: str | None = None,
) -> dict[str, Any]:
    query = (
        db.query(QrisObservation)
        .join(CaseObservation, CaseObservation.observation_id == QrisObservation.id)
        .filter(CaseObservation.case_id == case.id)
    )
    if provider_scope:
        query = query.filter(QrisObservation.source_provider_id == provider_scope)
    observations = query.order_by(QrisObservation.received_at.asc()).all()
    return {
        "id": str(case.id),
        "case_type": case.case_type,
        "status": case.status,
        "risk_score": case.risk_score,
        "participants": (case.evidence or {}).get("participants", {}),
        "payer_link_count": (case.evidence or {}).get("payer_link_count", 0),
        "score_semantics": "investigative_priority_not_crime_probability",
        "created_at": case.created_at.isoformat() + "Z",
        "updated_at": case.updated_at.isoformat() + "Z",
        "model_provenance": case.model_provenance,
        "evidence": case.evidence,
        "observations": [serialize_observation(item, include_payer=include_payer) for item in observations],
        "reviewer": case.reviewer,
        "reviewer_decision": case.reviewer_decision,
        "decision_reason": case.decision_reason,
    }
