from datetime import datetime, timedelta

import pytest

from app.ml.graph.dataset import CanonicalPayment, GraphBuilder
from app.ml.graph.model import build_model
from app.ml.graph.training import _pyg_data, train_qris_graphsage


def test_qris_graphsage_train_reload_inference_round_trip(tmp_path):
    pytest.importorskip("torch_geometric")
    import torch

    dataset = tmp_path / "qris.csv"
    dataset.write_text(
        "payment_id,timestamp,payer_id,merchant_id,outlet_id,qris_id,amount,payment_status,label\n"
        + "\n".join(
            f"p{i},{(datetime(2026, 1, 1) + timedelta(days=i)).isoformat()},payer-{i % 6},merchant-{i % 3},outlet-{i % 3},qris-{i % 3},{1000 + i},success,{i % 2}"
            for i in range(40)
        ),
        encoding="utf-8",
    )
    result = train_qris_graphsage(dataset, epochs=1, patience=1, limit_rows=40)
    assert result["dataset_name"] == "qris_graph"
    assert result["metrics"]["model_kind"] == "heterogeneous_graphsage"
    assert result["metrics"]["test"]["pr_auc"] is not None
    assert result["artifact_hash"]

    from app.ml.registry.model_registry import load_latest_model_by_dataset

    artifact = load_latest_model_by_dataset("qris_graph")
    assert artifact and artifact["artifact_hash"] == result["artifact_hash"]
    rows = [
        CanonicalPayment(
            payment_id=f"query-{i}",
            timestamp=datetime(2026, 2, 1) + timedelta(days=i),
            payer_id="payer-query",
            merchant_id="merchant-query",
            outlet_id=None,
            qris_id=None,
            amount=2000 + i,
            payment_status="success",
        )
        for i in range(2)
    ]
    snapshot = GraphBuilder.from_schema(artifact["model"]["graph_schema"]).build(rows, query_ids={rows[-1].payment_id})
    data = _pyg_data(snapshot)
    model = build_model(artifact["model"]["graph_schema"], artifact["model"]["hidden_dim"], artifact["model"]["dropout"])
    with torch.no_grad():
        model(data.x_dict, data.edge_index_dict)
    model.load_state_dict(artifact["model"]["state_dict"])
    model.eval()
    with torch.no_grad():
        score = float(torch.softmax(model(data.x_dict, data.edge_index_dict), dim=1)[snapshot.payment_indices[rows[-1].payment_id], 1])
    assert 0 <= score <= 1
