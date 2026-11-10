from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User
from app.ml.baseline_model import FraudBaselineModel, get_model_status
from app.ml.registry.model_registry import get_active_metrics, list_model_artifacts
from app.models.transaction import Transaction
from app.ml.continual.adaptive_trainer import (
    get_adaptive_learning_status,
    run_adaptive_retraining,
)
from app.ml.training.train_fingraph import train_fingraph_adaptive_model
from app.ml.training.train_qris import adaptive_status as qris_adaptive_status, train_qris_adaptive, train_qris_demo_model

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.get("/status")
def ml_status(current_user: User = Depends(get_current_user)):
    active_metrics = get_active_metrics()

    return {
        "baseline_model": get_model_status(),
        "active_tabular_model": active_metrics,
    }


@router.get("/metrics")
def get_ml_metrics(current_user: User = Depends(get_current_user)):
    active_metrics = get_active_metrics()

    if not active_metrics:
        return {
            "model_available": False,
            "message": "No trained tabular model available yet.",
        }

    return {
        "model_available": True,
        "active_model": active_metrics,
    }


@router.get("/models")
def get_ml_models(current_user: User = Depends(get_current_user)):
    return {
        "items": list_model_artifacts(),
    }


@router.post("/train-baseline")
def train_baseline_model(db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    transactions = (
        db.query(Transaction)
        .order_by(Transaction.transaction_time.desc())
        .limit(1000)
        .all()
    )

    try:
        model = FraudBaselineModel()
        result = model.train(transactions)
        return result

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/train/paysim")
def train_paysim_model(
    model: str = Query(default="xgboost", pattern="^(xgboost|logistic)$"),
    limit_rows: int | None = Query(default=None, ge=10000),
    current_user: User = Depends(require_roles("admin")),
):
    from app.ml.training.train_paysim import train_paysim_logistic, train_paysim_xgboost
    try:
        if model == "logistic":
            result = train_paysim_logistic(limit_rows=limit_rows)
        else:
            result = train_paysim_xgboost(limit_rows=limit_rows)

        return {
            "message": "PaySim model trained successfully",
            "result": result,
        }

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/adaptive/status")
def adaptive_learning_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    legacy = get_adaptive_learning_status(db)
    return {"qris": qris_adaptive_status(db), "legacy_paysim": legacy}


@router.post("/adaptive/retrain")
def adaptive_retrain(
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("analyst", "admin")),
):
    try:
        return run_adaptive_retraining(db=db, force=force)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.post("/train/fingraph")
def train_fingraph_model(
    min_samples: int = Query(default=10, ge=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    try:
        result = train_fingraph_adaptive_model(
            db=db,
            min_samples=min_samples,
        )

        return {
            "message": "FinGraph internal adaptive model trained successfully",
            "result": result,
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.post("/train/elliptic-graphsage")
def train_elliptic_graphsage_model(
    limit_nodes: int | None = Query(default=20000, ge=1000),
    epochs: int = Query(default=5, ge=1, le=100),
    current_user: User = Depends(require_roles("admin")),
):
    from app.ml.training.train_elliptic_graphsage import train_elliptic_graphsage
    try:
        result = train_elliptic_graphsage(
            limit_nodes=limit_nodes,
            epochs=epochs,
        )

        return {
            "message": "Elliptic GraphSAGE model trained successfully",
            "result": result,
        }

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/train/qris-tabular")
def train_qris_tabular(
    sample_count: int = Query(default=1200, ge=200, le=100000),
    current_user: User = Depends(require_roles("admin")),
):
    return {"message": "Model QRIS demo berhasil dilatih", "result": train_qris_demo_model(sample_count)}


@router.post("/adaptive/qris-retrain")
def retrain_qris_adaptive(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("analyst", "admin")),
):
    try:
        return {"message": "Model adaptive QRIS berhasil dilatih", "result": train_qris_adaptive(db)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/graphsage/status")
def graphsage_status(current_user: User = Depends(get_current_user)):
    artifacts = [item for item in list_model_artifacts() if item.get("dataset_name") == "elliptic"]
    qris_artifacts = [item for item in list_model_artifacts() if item.get("dataset_name") == "qris_graph"]
    return {
        "prototype": True, "model_available": bool(qris_artifacts or artifacts),
        "qris_model_available": bool(qris_artifacts),
        "qris_active_model": qris_artifacts[0] if qris_artifacts else None,
        "qris_artifacts": qris_artifacts[:5],
        "active_model": artifacts[0] if artifacts else None,
        "fallback": "graph_heuristic", "note": "QRIS GraphSAGE dipakai untuk observation inference jika artifact qris_graph tersedia; selain itu graph heuristic menjadi fallback.",
    }
