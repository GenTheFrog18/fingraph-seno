from datetime import datetime, timedelta, timezone
from typing import Any
import hashlib
import hmac
import json
import uuid

import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, extra_data: dict[str, Any] | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "nbf": datetime.now(timezone.utc),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "jti": uuid.uuid4().hex,
    }

    if extra_data:
        payload.update(extra_data)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
        )
    except InvalidTokenError:
        return None


def require_demo_secret() -> bytes:
    if not settings.PJP_SIMULATOR_SECRET:
        raise RuntimeError("PJP_SIMULATOR_SECRET belum dikonfigurasi")
    return settings.PJP_SIMULATOR_SECRET.encode("utf-8")


def canonical_json(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sign_pjp_payload(payload: dict[str, Any]) -> str:
    return hmac.new(require_demo_secret(), canonical_json(payload), hashlib.sha256).hexdigest()


def verify_pjp_signature(payload: dict[str, Any], signature: str) -> bool:
    try:
        expected = sign_pjp_payload(payload)
    except RuntimeError:
        return False
    return hmac.compare_digest(expected, signature.removeprefix("sha256="))


def _psp_event_mac(provider_id: str, send_timestamp: int, raw_body: bytes) -> str | None:
    secret = settings.psp_event_keys.get(provider_id)
    if not secret:
        return None
    message = str(send_timestamp).encode("ascii") + b"." + raw_body
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def sign_psp_event(provider_id: str, send_timestamp: int, raw_body: bytes) -> str:
    signature = _psp_event_mac(provider_id, send_timestamp, raw_body)
    if signature is None:
        raise RuntimeError("PSP event provider key belum dikonfigurasi")
    return f"sha256={signature}"


def verify_psp_event_signature(provider_id: str, send_timestamp: int, raw_body: bytes, signature: str) -> bool:
    if abs(int(datetime.now(timezone.utc).timestamp()) - send_timestamp) > settings.PSP_EVENT_SIGNATURE_TOLERANCE_SECONDS:
        return False
    expected = _psp_event_mac(provider_id, send_timestamp, raw_body)
    if expected is None:
        return False
    return hmac.compare_digest(expected, signature.removeprefix("sha256="))


def pseudonymize_payer(raw_identifier: str) -> str:
    key = settings.PAYER_PSEUDONYM_KEY or settings.PJP_SIMULATOR_SECRET
    if not key:
        raise RuntimeError("PAYER_PSEUDONYM_KEY belum dikonfigurasi")
    digest = hmac.new(key.encode("utf-8"), raw_identifier.strip().lower().encode("utf-8"), hashlib.sha256).hexdigest()
    return f"payer_{digest[:24]}"


def payload_fingerprint(payload: str) -> str:
    return hashlib.sha256(payload.strip().encode("utf-8")).hexdigest()
