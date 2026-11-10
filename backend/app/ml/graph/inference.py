from __future__ import annotations

import hashlib
import json
from datetime import timedelta
from typing import Any

import torch
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml.graph.dataset import CanonicalPayment, GraphBuilder
from app.ml.graph.model import build_model
from app.ml.graph.training import _pyg_data
from app.ml.registry.model_registry import load_latest_model_by_dataset
from app.models.qris_intelligence import QrisObservation


def _naive(value):
    return value.replace(tzinfo=None) if value and value.tzinfo else value


def _row(observation: QrisObservation) -> CanonicalPayment:
    payer = None
    if observation.payer_token:
        payer = f"{observation.issuer_id}:{observation.payer_token_scheme or 'unspecified'}:{observation.payer_token}"
    merchant = f"{observation.source_provider_id}:{observation.merchant_ref}"
    qris = f"{observation.source_provider_id}:{observation.qris_ref}" if observation.qris_ref else None
    return CanonicalPayment(
        payment_id=f"{observation.source_provider_id}:{observation.source_payment_id}",
        timestamp=_naive(observation.occurred_at),
        payer_id=payer,
        merchant_id=merchant,
        outlet_id=None,
        qris_id=qris,
        amount=float(observation.amount_idr),
        payment_status="success",
        pjp_id=observation.source_provider_id,
    )


def _schema_hash(value: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def score_observation(db: Session, observation: QrisObservation, max_nodes: int | None = None) -> dict[str, Any]:
    artifact = load_latest_model_by_dataset("qris_graph")
    if not artifact:
        return {"status": "fallback", "signal_type": "graph_heuristic", "score": None, "fallback_reason": "qris_graphsage_artifact_missing"}
    try:
        model_payload = artifact["model"]
        cutoff = _naive(observation.received_at)
        window_start = cutoff - timedelta(seconds=settings.QRIS_OBSERVATION_WINDOW_SECONDS)
        query = db.query(QrisObservation).filter(
            QrisObservation.received_at >= window_start,
            QrisObservation.received_at <= cutoff,
            or_(
                QrisObservation.merchant_ref == observation.merchant_ref,
                QrisObservation.source_provider_id == observation.source_provider_id,
                (QrisObservation.issuer_id == observation.issuer_id) & (QrisObservation.payer_token == observation.payer_token),
            ),
        ).order_by(QrisObservation.received_at.desc()).limit(max_nodes or settings.QRIS_GNN_MAX_NODES)
        rows = query.all()
        current = _row(observation)
        canonical_rows = [_row(item) for item in rows]
        if not any(item.payment_id == current.payment_id for item in canonical_rows):
            canonical_rows.append(current)
        builder = GraphBuilder.from_schema(model_payload["graph_schema"])
        snapshot = builder.build(canonical_rows, query_ids={current.payment_id})
        data = _pyg_data(snapshot)
        model = build_model(model_payload["graph_schema"], model_payload.get("hidden_dim", 64), model_payload.get("dropout", 0.2))
        with torch.no_grad():
            model(data.x_dict, data.edge_index_dict)
        model.load_state_dict(model_payload["state_dict"])
        model.eval()
        with torch.no_grad():
            logits = model(data.x_dict, data.edge_index_dict)
            score = float(torch.softmax(logits, dim=1)[snapshot.payment_indices[current.payment_id], 1])
        return {
            "status": "complete",
            "signal_type": "learned_qris_gnn",
            "score": round(max(0.0, min(score, 1.0)), 4),
            "threshold": model_payload.get("threshold"),
            "model_version": artifact.get("version"),
            "artifact_hash": artifact.get("artifact_hash"),
            "graph_schema_hash": _schema_hash(model_payload["graph_schema"]),
            "feature_schema_hash": _schema_hash({"features": model_payload["graph_schema"].get("feature_names", [])}),
            "as_of_utc": cutoff.isoformat() + "Z",
            "window_seconds": settings.QRIS_OBSERVATION_WINDOW_SECONDS,
            "node_count": sum(value.shape[0] for value in snapshot.x_dict.values()),
            "edge_count": sum(value.shape[1] for value in snapshot.edge_index_dict.values()),
            "fallback_reason": None,
        }
    except Exception as exc:
        return {
            "status": "fallback",
            "signal_type": "graph_heuristic",
            "score": None,
            "fallback_reason": f"qris_graphsage_inference_failed:{type(exc).__name__}",
        }
