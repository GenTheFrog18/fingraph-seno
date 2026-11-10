from __future__ import annotations

import random
from pathlib import Path
from typing import Any, Callable

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score

from app.ml.graph.dataset import GraphBuilder, GraphSnapshot, load_qris_dataset, split_rows
from app.ml.graph.model import build_model
from app.ml.registry.model_registry import save_model_artifact


def _pyg_data(snapshot: GraphSnapshot):
    try:
        from torch_geometric.data import HeteroData
    except ImportError as exc:
        raise RuntimeError("torch-geometric is required for QRIS GraphSAGE training") from exc
    data = HeteroData()
    for kind, features in snapshot.x_dict.items():
        data[kind].x = features
    for edge_type, edge_index in snapshot.edge_index_dict.items():
        data[edge_type].edge_index = edge_index
    return data


def _mask(snapshot: GraphSnapshot, ids: set[str]) -> torch.Tensor:
    mask = torch.zeros_like(snapshot.label_mask)
    for payment_id in ids:
        index = snapshot.payment_indices.get(payment_id)
        if index is not None:
            mask[index] = snapshot.labels[index] >= 0
    return mask


def _metrics(y: np.ndarray, probability: np.ndarray, threshold: float = 0.5) -> dict[str, Any]:
    predicted = (probability >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, predicted, labels=[0, 1]).ravel() if len(y) else (0, 0, 0, 0)
    positives = int((y == 1).sum())
    negatives = int((y == 0).sum())
    return {
        "pr_auc": round(float(average_precision_score(y, probability)), 4) if positives and negatives else None,
        "roc_auc": round(float(roc_auc_score(y, probability)), 4) if positives and negatives else None,
        "precision": round(float(precision_score(y, predicted, zero_division=0)), 4) if len(y) else None,
        "recall": round(float(recall_score(y, predicted, zero_division=0)), 4) if len(y) else None,
        "f1": round(float(f1_score(y, predicted, zero_division=0)), 4) if len(y) else None,
        "samples": int(len(y)),
        "class_counts": {"legitimate": negatives, "fraud_scenario": positives},
        "confusion": {"true_negative": int(tn), "false_positive": int(fp), "false_negative": int(fn), "true_positive": int(tp)},
    }


def _probabilities(logits: torch.Tensor, snapshot: GraphSnapshot, ids: set[str]) -> tuple[np.ndarray, np.ndarray]:
    mask = _mask(snapshot, ids)
    y = snapshot.labels[mask].detach().cpu().numpy()
    probability = torch.softmax(logits[mask], dim=1)[:, 1].detach().cpu().numpy()
    return y, probability


def _evaluate(logits: torch.Tensor, snapshot: GraphSnapshot, ids: set[str], threshold: float = 0.5) -> dict[str, Any]:
    y, probability = _probabilities(logits, snapshot, ids)
    return _metrics(y, probability, threshold)


def _select_threshold(y: np.ndarray, probability: np.ndarray, default: float = 0.5) -> float:
    if len(y) == 0 or len(np.unique(y)) < 2:
        return default
    best_threshold, best_key = default, (-1.0, -1.0, float("inf"))
    for threshold in np.unique(np.concatenate((np.asarray([default]), probability))):
        predicted = (probability >= threshold).astype(int)
        key = (float(f1_score(y, predicted, zero_division=0)), float(recall_score(y, predicted, zero_division=0)), -float(threshold))
        if key > best_key:
            best_key, best_threshold = key, float(threshold)
    return round(best_threshold, 6)


def _payment_features(snapshot: GraphSnapshot, ids: set[str]) -> tuple[np.ndarray, np.ndarray]:
    kind = "payment" if snapshot.mode == "heterogeneous" else "node"
    indices = [snapshot.payment_indices[payment_id] for payment_id in snapshot.payment_ids if payment_id in ids and snapshot.labels[snapshot.payment_indices[payment_id]] >= 0]
    features = snapshot.x_dict[kind][indices]
    labels = snapshot.labels[indices].detach().cpu().numpy()
    return features.detach().cpu().numpy(), labels


def _baseline_metrics(model: LogisticRegression, snapshot: GraphSnapshot, ids: set[str]) -> dict[str, Any]:
    x, y = _payment_features(snapshot, ids)
    return _metrics(y, model.predict_proba(x)[:, 1]) if len(y) else _metrics(y, np.asarray([], dtype=float))


def _report(callback: Callable[[dict[str, Any]], None] | None, **progress: Any) -> None:
    if callback:
        callback(progress)


def train_qris_graphsage(
    data_path: str | Path,
    epochs: int = 10,
    limit_rows: int | None = None,
    hidden_dim: int = 64,
    learning_rate: float = 0.003,
    dropout: float = 0.2,
    weight_decay: float = 1e-4,
    patience: int = 5,
    seed: int = 42,
    progress_callback: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    if not 1 <= epochs <= 100:
        raise ValueError("epochs must be between 1 and 100")
    if limit_rows is not None and not 40 <= limit_rows <= 100_000:
        raise ValueError("limit_rows must be between 40 and 100000")
    if not 16 <= hidden_dim <= 128:
        raise ValueError("hidden_dim must be between 16 and 128")
    if not 1e-5 <= learning_rate <= 1e-2:
        raise ValueError("learning_rate must be between 0.00001 and 0.01")
    if not 0 <= dropout <= 0.6:
        raise ValueError("dropout must be between 0 and 0.6")

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    _report(progress_callback, phase="loading")
    rows = load_qris_dataset(data_path, limit_rows)
    labeled = [row for row in rows if row.label is not None]
    if len(labeled) < 4 or {row.label for row in labeled} != {0, 1}:
        raise ValueError("QRIS dataset needs at least four labeled rows and both classes")
    split = split_rows(rows, seed=seed)
    train_rows = [row for row in rows if row.payment_id in split.train_ids]
    validation_rows = [row for row in rows if row.payment_id in split.validation_ids]
    test_rows = [row for row in rows if row.payment_id in split.test_ids]
    if {row.label for row in train_rows if row.label is not None} != {0, 1}:
        raise ValueError("training split needs both labels")
    if {row.label for row in validation_rows if row.label is not None} != {0, 1}:
        raise ValueError("validation split needs both labels")

    builder = GraphBuilder(train_rows)
    train_snapshot = builder.build(train_rows)
    validation_snapshot = builder.build(train_rows + validation_rows, query_ids=split.validation_ids)
    test_snapshot = builder.build(train_rows + validation_rows + test_rows, query_ids=split.test_ids)
    train_data, validation_data, test_data = map(_pyg_data, (train_snapshot, validation_snapshot, test_snapshot))

    model = build_model(train_snapshot.schema, hidden_dim=hidden_dim, dropout=dropout)
    with torch.no_grad():
        model(train_data.x_dict, train_data.edge_index_dict)
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=weight_decay)
    target_mask = _mask(train_snapshot, split.train_ids)
    targets = train_snapshot.labels[target_mask]
    counts = torch.bincount(targets, minlength=2).float()
    loss_fn = torch.nn.CrossEntropyLoss(weight=(counts.sum() / counts.clamp_min(1)).to(torch.float32))
    best_state: dict[str, torch.Tensor] | None = None
    best_pr, stale_epochs, best_epoch = -1.0, 0, 0
    history: list[dict[str, float | int]] = []
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        logits = model(train_data.x_dict, train_data.edge_index_dict)
        loss = loss_fn(logits[target_mask], targets)
        if not torch.isfinite(loss):
            raise ValueError("training produced a non-finite loss")
        loss.backward()
        optimizer.step()
        model.eval()
        with torch.no_grad():
            validation_logits = model(validation_data.x_dict, validation_data.edge_index_dict)
        validation_metrics = _evaluate(validation_logits, validation_snapshot, split.validation_ids)
        score = validation_metrics["pr_auc"]
        if score is None:
            raise ValueError("validation PR-AUC unavailable")
        history.append({"epoch": epoch, "train_loss": round(float(loss.item()), 6), "validation_pr_auc": score})
        if score > best_pr:
            best_pr, best_epoch, stale_epochs = score, epoch, 0
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        else:
            stale_epochs += 1
        _report(progress_callback, phase="training", epoch=epoch, epochs=epochs, validation_pr_auc=score, best_epoch=best_epoch)
        if stale_epochs >= patience:
            break
    if best_state is None:
        raise ValueError("training did not produce a usable model")

    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        train_logits = model(train_data.x_dict, train_data.edge_index_dict)
        validation_logits = model(validation_data.x_dict, validation_data.edge_index_dict)
        test_logits = model(test_data.x_dict, test_data.edge_index_dict)
    train_x, train_y = _payment_features(train_snapshot, split.train_ids)
    baseline = LogisticRegression(max_iter=2000, class_weight="balanced", random_state=seed).fit(train_x, train_y)
    validation_y, validation_probability = _probabilities(validation_logits, validation_snapshot, split.validation_ids)
    threshold = _select_threshold(validation_y, validation_probability)
    metrics = {
        "features": train_snapshot.schema["feature_names"],
        "split_strategy": split.strategy,
        "split_warning": split.warning,
        "dataset_rows": len(rows),
        "train": _evaluate(train_logits, train_snapshot, split.train_ids, threshold),
        "validation": _evaluate(validation_logits, validation_snapshot, split.validation_ids, threshold),
        "test": _evaluate(test_logits, test_snapshot, split.test_ids, threshold),
        "baseline_validation": _baseline_metrics(baseline, validation_snapshot, split.validation_ids),
        "baseline_test": _baseline_metrics(baseline, test_snapshot, split.test_ids),
        "epochs": len(history),
        "best_epoch": best_epoch,
        "epoch_history": history,
        "hidden_dim": hidden_dim,
        "learning_rate": learning_rate,
        "dropout": dropout,
        "weight_decay": weight_decay,
        "patience": patience,
        "seed": seed,
        "model_kind": model.model_kind,
        "threshold": threshold,
        "threshold_selection": "validation_f1",
        "schema_version": 1,
        "graph_schema": train_snapshot.schema,
        "label_semantics": "synthetic_scenario_only",
    }
    artifact_model = {
        "state_dict": model.state_dict(),
        "model_kind": model.model_kind,
        "hidden_dim": hidden_dim,
        "dropout": dropout,
        "threshold": threshold,
        "graph_schema": train_snapshot.schema,
    }
    saved = save_model_artifact(artifact_model, None, metrics, "qris_graph", "graphsage")
    _report(progress_callback, phase="complete", epoch=len(history), epochs=epochs, best_epoch=best_epoch)
    return {**saved, "metrics": metrics}
