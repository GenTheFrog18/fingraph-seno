"""Send the approved three-PSP post-event investigation demo to a running API."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def _keys() -> dict[str, str]:
    values: dict[str, str] = {}
    for item in os.getenv("PSP_EVENT_KEYS", "psp_a=demo-psp-a-key;psp_b=demo-psp-b-key;psp_c=demo-psp-c-key").split(";"):
        provider, separator, secret = item.partition("=")
        if separator and provider.strip() and secret.strip():
            values[provider.strip().lower()] = secret.strip()
    return values


def _signature(provider: str, timestamp: int, body: bytes, keys: dict[str, str]) -> str:
    message = f"{timestamp}.".encode() + body
    digest = hmac.new(keys[provider].encode(), message, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def _post(base_url: str, provider: str, payload: dict[str, object], keys: dict[str, str]) -> dict[str, object]:
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    timestamp = int(time.time())
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/v1/psp/events",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-FG-Provider": provider,
            "X-FG-Timestamp": str(timestamp),
            "X-FG-Signature": _signature(provider, timestamp, body, keys),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return {"provider": provider, "status_code": response.status, "response": json.loads(response.read())}
    except urllib.error.HTTPError as error:
        return {"provider": provider, "status_code": error.code, "response": json.loads(error.read())}


def _events() -> list[tuple[str, dict[str, object]]]:
    occurred_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    common = {
        "schema_version": "fingraph.qris.observation.v1",
        "event_type": "payment.succeeded",
        "payment_method": "QRIS",
        "currency": "IDR",
        "issuer_id": "issuer_demo_bank",
        "payer_token_scheme": "issuer_token_v1",
        "qris_ref": "qris-demo-network",
        "occurred_at": occurred_at,
    }
    rows = [
        ("psp_a", "merchant_alpha", "payer_shared_01"),
        ("psp_b", "merchant_beta", "payer_shared_01"),
        ("psp_b", "merchant_beta", "payer_shared_02"),
        ("psp_c", "merchant_gamma", "payer_shared_02"),
        ("psp_a", "merchant_delta", "payer_shared_02"),
        ("psp_c", "merchant_benign", None),
    ]
    events: list[tuple[str, dict[str, object]]] = []
    for index, (provider, merchant, payer) in enumerate(rows, start=1):
        payload = {
            **common,
            "source_event_id": f"demo-event-{index:03d}",
            "source_payment_id": f"demo-payment-{index:03d}",
            "amount_idr": 125000 + index * 1000,
            "merchant_ref": merchant,
            "acquirer_id": provider,
        }
        if payer:
            payload["payer_token"] = payer
        events.append((provider, payload))
    return events


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.getenv("FINGRAPH_BASE_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    keys = _keys()
    missing = sorted({provider for provider, _ in _events()} - keys.keys())
    if missing:
        raise SystemExit(f"Missing PSP_EVENT_KEYS for: {', '.join(missing)}")
    results = [_post(args.base_url, provider, payload, keys) for provider, payload in _events()]
    summary = {
        "mode": "post_event_only",
        "events_sent": len(results),
        "accepted": sum(item["status_code"] == 202 for item in results),
        "case_ids": sorted({item.get("response", {}).get("case_id") for item in results if item.get("response", {}).get("case_id")}),
        "results": results,
    }
    rendered = json.dumps(summary, indent=2, sort_keys=True)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
