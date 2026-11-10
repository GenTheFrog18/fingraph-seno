import json
import time
from datetime import datetime, timedelta, timezone

from app.core.security import sign_psp_event
from app.core.security import hash_password
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.audit_log import AuditLog
from app.models.qris_intelligence import QrisObservation
from app.models.user import User
from app.services.qris_intelligence import _window_rows


def _event(event_id: str, payment_id: str, provider: str, merchant: str, payer: str, *, occurred_at: datetime | None = None):
    return {
        "schema_version": "fingraph.qris.observation.v1",
        "source_event_id": event_id,
        "source_payment_id": payment_id,
        "event_type": "payment.succeeded",
        "occurred_at": (occurred_at or datetime.now(timezone.utc)).isoformat().replace("+00:00", "Z"),
        "payment_method": "QRIS",
        "amount_idr": 25000,
        "merchant_ref": merchant,
        "acquirer_id": provider,
        "issuer_id": "issuer_demo",
        "payer_token": payer,
        "payer_token_scheme": "issuer_scoped_demo_v1",
        "qris_ref": f"{merchant}-qr",
    }


def _post_event(client, payload, provider="psp_a", timestamp=None, signature_override=None):
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    timestamp = timestamp or int(time.time())
    signature = signature_override or sign_psp_event(provider, timestamp, body)
    return client.post(
        "/api/v1/psp/events",
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-FG-Provider": provider,
            "X-FG-Timestamp": str(timestamp),
            "X-FG-Signature": signature,
        },
    )


def test_psp_event_auth_idempotency_and_conflict(client, merchant_headers):
    payload = _event("evt-auth-1", "pay-auth-1", "psp_a", "merchant-auth", "payer-auth")
    accepted = _post_event(client, payload)
    assert accepted.status_code == 202, accepted.text
    assert accepted.json()["status"] == "accepted"
    assert accepted.json()["scoring_status"] == "fallback"

    duplicate = _post_event(client, payload)
    assert duplicate.status_code == 202
    assert duplicate.json()["status"] == "already_seen"
    assert duplicate.json()["observation_id"] == accepted.json()["observation_id"]

    changed = {**payload, "amount_idr": 26000}
    conflict = _post_event(client, changed)
    assert conflict.status_code == 409

    invalid = _post_event(client, _event("evt-auth-2", "pay-auth-2", "psp_a", "merchant-auth", "payer-auth"), signature_override="sha256=bad")
    assert invalid.status_code == 401

    stale = _post_event(client, _event("evt-auth-3", "pay-auth-3", "psp_a", "merchant-auth", "payer-auth"), timestamp=int(time.time()) - 1000)
    assert stale.status_code == 401

    forbidden = client.get("/api/v1/cases", headers=merchant_headers)
    assert forbidden.status_code == 403
    assert client.get("/api/v1/cases").status_code == 401
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "PSP Affiliated Analyst",
            "email": "psp-affiliated@example.com",
            "password": "password123456",
            "role": "analyst",
            "institution_name": "PSP A",
        },
    )
    assert registration.status_code == 403

    db = SessionLocal()
    try:
        db.add(
            User(
                email="psp-affiliated-jwt@example.com",
                full_name="PSP Affiliated JWT",
                role="analyst",
                institution_name="PSP A",
                hashed_password=hash_password("password123456"),
            )
        )
        db.commit()
    finally:
        db.close()
    affiliated = client.post(
        "/api/v1/auth/login",
        json={"email": "psp-affiliated-jwt@example.com", "password": "password123456"},
    )
    assert affiliated.status_code == 200
    affiliated_headers = {"Authorization": f"Bearer {affiliated.json()['access_token']}"}
    assert client.get("/api/v1/cases", headers=affiliated_headers).status_code == 403


def test_cross_provider_component_creates_one_case_and_redacts_tokens(client, analyst_headers):
    now = datetime.now(timezone.utc)
    events = [
        _event("evt-ring-1", "pay-ring-1", "psp_a", "merchant-ring-a", "payer-one", occurred_at=now - timedelta(minutes=4)),
        _event("evt-ring-2", "pay-ring-2", "psp_b", "merchant-ring-b", "payer-one", occurred_at=now - timedelta(minutes=3)),
        _event("evt-ring-3", "pay-ring-3", "psp_b", "merchant-ring-b", "payer-two", occurred_at=now - timedelta(minutes=2)),
        _event("evt-ring-4", "pay-ring-4", "psp_c", "merchant-ring-c", "payer-two", occurred_at=now - timedelta(minutes=1)),
    ]
    responses = [_post_event(client, event, event["acquirer_id"]) for event in events]
    assert all(response.status_code == 202 for response in responses), [response.text for response in responses]
    case_id = responses[-1].json()["case_id"]
    assert case_id

    cases = client.get("/api/v1/cases", headers=analyst_headers)
    assert cases.status_code == 200
    matching = [item for item in cases.json()["items"] if item["id"] == case_id]
    assert len(matching) == 1
    assert matching[0]["payer_link_count"] == 2

    detail = client.get(f"/api/v1/cases/{case_id}", headers=analyst_headers)
    assert detail.status_code == 200
    assert len(detail.json()["observations"]) == 4
    assert all(item["payer_token"] is None for item in detail.json()["observations"])
    assert set(detail.json()["evidence"]["participants"]["providers"]) == {"psp_a", "psp_b", "psp_c"}

    graph = client.get(f"/api/v1/cases/{case_id}/graph", headers=analyst_headers)
    assert graph.status_code == 200
    assert graph.json()["nodes"]
    assert all("payer_token" not in node for node in graph.json()["nodes"])
    assert any(node["entity_type"] == "payer_link" for node in graph.json()["nodes"])
    assert any(edge["reason"] for edge in graph.json()["edges"])
    assert "payer-one" not in json.dumps(graph.json())

    updated = client.patch(
        f"/api/v1/cases/{case_id}/status",
        headers=analyst_headers,
        json={"status": "under_review", "reason": "Analyst confirmed cross-PSP topology for review."},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "under_review"


def test_dismissed_case_reopens_with_audit_history(client, analyst_headers):
    now = datetime.now(timezone.utc)
    events = [
        _event("evt-reopen-1", "pay-reopen-1", "psp_a", "merchant-reopen-a", "payer-reopen-one", occurred_at=now - timedelta(minutes=4)),
        _event("evt-reopen-2", "pay-reopen-2", "psp_b", "merchant-reopen-b", "payer-reopen-one", occurred_at=now - timedelta(minutes=3)),
        _event("evt-reopen-3", "pay-reopen-3", "psp_b", "merchant-reopen-b", "payer-reopen-two", occurred_at=now - timedelta(minutes=2)),
        _event("evt-reopen-4", "pay-reopen-4", "psp_c", "merchant-reopen-c", "payer-reopen-two", occurred_at=now - timedelta(minutes=1)),
    ]
    responses = [_post_event(client, event, event["acquirer_id"]) for event in events]
    case_id = responses[-1].json()["case_id"]
    assert case_id
    dismissed = client.patch(
        f"/api/v1/cases/{case_id}/status",
        headers=analyst_headers,
        json={"status": "dismissed", "reason": "Initial review complete."},
    )
    assert dismissed.status_code == 200

    reopened = _post_event(
        client,
        _event("evt-reopen-5", "pay-reopen-5", "psp_a", "merchant-reopen-a", "payer-reopen-one", occurred_at=now),
        "psp_a",
    )
    assert reopened.status_code == 202, reopened.text
    assert reopened.json()["case_id"] == case_id
    detail = client.get(f"/api/v1/cases/{case_id}", headers=analyst_headers)
    assert detail.status_code == 200
    assert detail.json()["status"] == "suspected"

    db = SessionLocal()
    try:
        audit = db.query(AuditLog).filter(AuditLog.action == "reopen_network_case", AuditLog.entity_id == case_id).one()
        assert audit.metadata_json["previous_review"]["status"] == "dismissed"
    finally:
        db.close()


def test_temporal_window_keeps_current_and_selects_newest_rows():
    db = SessionLocal()
    original_cap = settings.QRIS_GNN_MAX_NODES
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        settings.QRIS_GNN_MAX_NODES = 3
        rows = []
        for index in range(5):
            rows.append(
                QrisObservation(
                    source_provider_id="psp_window",
                    source_event_id=f"window-event-{index}",
                    source_payment_id=f"window-payment-{index}",
                    event_type="payment.succeeded",
                    payment_method="QRIS",
                    occurred_at=now - timedelta(minutes=10 - index),
                    received_at=now - timedelta(minutes=10 - index),
                    amount_idr=1000 + index,
                    merchant_ref=f"window-merchant-{index}",
                    acquirer_id="psp_window",
                    issuer_id="issuer_window",
                    payer_token=f"payer-window-{index}",
                    payer_token_scheme="scheme-v1",
                    raw_payload_hash=f"{index:064d}",
                    send_timestamp=int(now.timestamp()),
                    signature_key_id="psp_window",
                )
            )
        db.add_all(rows)
        db.flush()
        selected = _window_rows(db, rows[4])
        assert [row.source_event_id for row in selected] == ["window-event-2", "window-event-3", "window-event-4"]
    finally:
        settings.QRIS_GNN_MAX_NODES = original_cap
        db.rollback()
        db.close()
