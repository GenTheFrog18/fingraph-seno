"""Train the learned QRIS GraphSAGE artifact used by the local demo.

With no --data-path this creates a deterministic, synthetic, non-production CSV
in a temporary directory. Real training jobs should pass an approved dataset
path explicitly and retain the dataset manifest with the resulting metrics.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ml.graph.training import train_qris_graphsage


def _write_demo_dataset(path: Path, rows: int = 120) -> None:
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "payment_id",
                "timestamp",
                "payer_id",
                "merchant_id",
                "outlet_id",
                "qris_id",
                "amount",
                "payment_status",
                "label",
            ]
        )
        for index in range(rows):
            writer.writerow(
                [
                    f"demo-payment-{index:04d}",
                    (start + timedelta(hours=index)).isoformat(),
                    f"demo-payer-{index % 8}",
                    f"demo-merchant-{index % 6}",
                    f"demo-outlet-{index % 6}",
                    f"demo-qris-{index % 6}",
                    1000 + ((index * 137) % 900000),
                    "success",
                    int(index % 5 == 0),
                ]
            )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-path", type=Path)
    parser.add_argument("--limit-rows", type=int, default=120)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    if args.data_path:
        result = train_qris_graphsage(args.data_path, epochs=args.epochs, limit_rows=args.limit_rows)
    else:
        with tempfile.TemporaryDirectory(prefix="fingraph-qris-train-") as directory:
            dataset = Path(directory) / "qris_demo_training.csv"
            _write_demo_dataset(dataset, max(args.limit_rows, 40))
            result = train_qris_graphsage(dataset, epochs=args.epochs, limit_rows=args.limit_rows)

    payload = {
        "dataset_mode": "approved_path" if args.data_path else "deterministic_synthetic_demo",
        "result": result,
    }
    rendered = json.dumps(payload, indent=2, default=str)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
