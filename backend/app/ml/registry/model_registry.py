import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
from app.core.config import settings
from app.ml.artifact_security import sign_artifact, verify_artifact


ARTIFACT_DIR = Path(settings.ML_ARTIFACT_DIR).expanduser().resolve()
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

ACTIVE_MODEL_PATH = ARTIFACT_DIR / "active_tabular_model.joblib"
ACTIVE_METRICS_PATH = ARTIFACT_DIR / "active_tabular_metrics.json"


def save_model_artifact(
    model: Any,
    preprocessor: Any,
    metrics: dict[str, Any],
    dataset_name: str,
    model_name: str,
) -> dict[str, Any]:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    version = f"{dataset_name}_{model_name}_{timestamp}"

    model_path = ARTIFACT_DIR / f"{version}.joblib"
    metrics_path = ARTIFACT_DIR / f"{version}_metrics.json"

    artifact = {
        "model": model,
        "preprocessor": preprocessor,
        "dataset_name": dataset_name,
        "model_name": model_name,
        "version": version,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "feature_list": metrics.get("features", []),
        "metrics": metrics,
    }

    joblib.dump(artifact, model_path)
    sign_artifact(model_path)
    artifact_hash = hashlib.sha256(model_path.read_bytes()).hexdigest()

    metrics_payload = {
        **metrics,
        "dataset_name": dataset_name,
        "model_name": model_name,
        "version": version,
        "model_path": str(model_path),
        "created_at": artifact["created_at"],
        "artifact_hash": artifact_hash,
    }

    with open(metrics_path, "w", encoding="utf-8") as file:
        json.dump(metrics_payload, file, indent=2)

    if dataset_name == "paysim":
        joblib.dump(artifact, ACTIVE_MODEL_PATH)
        sign_artifact(ACTIVE_MODEL_PATH)

        with open(ACTIVE_METRICS_PATH, "w", encoding="utf-8") as file:
            json.dump(metrics_payload, file, indent=2)

    return metrics_payload


def load_active_model() -> dict[str, Any] | None:
    if not ACTIVE_MODEL_PATH.exists():
        return None

    verify_artifact(ACTIVE_MODEL_PATH)
    return joblib.load(ACTIVE_MODEL_PATH)


def get_active_metrics() -> dict[str, Any] | None:
    if not ACTIVE_METRICS_PATH.exists():
        return None

    with open(ACTIVE_METRICS_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def list_model_artifacts() -> list[dict[str, Any]]:
    metrics_files = sorted(ARTIFACT_DIR.glob("*_metrics.json"), reverse=True)
    items: list[dict[str, Any]] = []

    for path in metrics_files:
        if path.name == ACTIVE_METRICS_PATH.name:
            continue

        with open(path, "r", encoding="utf-8") as file:
            items.append(json.load(file))

    return items

def load_latest_model_by_dataset(dataset_name: str) -> dict[str, Any] | None:
    metrics_files = sorted(ARTIFACT_DIR.glob("*_metrics.json"), reverse=True)

    for path in metrics_files:
        if path.name == ACTIVE_METRICS_PATH.name:
            continue

        with open(path, "r", encoding="utf-8") as file:
            metrics = json.load(file)

        if metrics.get("dataset_name") != dataset_name:
            continue

        model_path = metrics.get("model_path")

        if not model_path:
            continue

        model_file = Path(model_path).expanduser().resolve()

        if model_file.parent != ARTIFACT_DIR or model_file.suffix != ".joblib" or not model_file.exists():
            continue

        verify_artifact(model_file)
        artifact = joblib.load(model_file)
        artifact["artifact_hash"] = hashlib.sha256(model_file.read_bytes()).hexdigest()
        return artifact

    return None
