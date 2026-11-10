# FinGraph implementation checkpoint

Updated: 2026-11-10

## Current gate

- Gate 0: passed. `agents/primary` is the implementation worktree; existing `scripts/smoke-test.sh` mode change preserved. Canonical runtime remains untouched.
- Gate 1: passed in a disposable backend-image container. The archived QRIS GraphSAGE adapter trained, saved, reloaded, and inferred on a heterogeneous graph. The repeatable local trainer now creates a signed `qris_graph` artifact and records temporal-split metrics and an artifact hash.
- Gate 2: passed. Additive `qris_observations`/`network_cases`/`case_observations` storage, per-PSP HMAC authentication, freshness, idempotency, conflict handling, strict schema validation, and redacted case APIs are implemented.
- Gate 3: passed. Learned QRIS GraphSAGE inference is used when a verified artifact is present; the bounded graph heuristic remains a separate fallback and is recorded in provenance.
- Gate 4: passed. The analyst shell includes a network-case list/detail view, status transitions, evidence observations, and a privacy-preserving case graph summary.
- Gate 5: passed. The final isolated backend run applied Alembic head and passed 33 tests. Frontend typecheck, lint (one pre-existing warning in `auth.ts`), and production build passed. The Docker image built successfully and imports `torch 2.5.1+cpu`, `torch-geometric 2.6.1`, and `app.main`.
- Live evidence: built-image demo trained `qris_graph_graphsage_20261110_034112` with artifact hash `e248ff073fa487839adb708c098b6dc5b4c3affc4d457535ea4a19ef51a264db`, temporal split, heterogeneous GraphSAGE, validation PR-AUC `0.225`, test PR-AUC `0.2937`; six signed PSP events were accepted, all six received complete learned-GNN scores, and one network case was opened.
- Gate 6: in progress. Package the required return ZIP and perform the final artifact/working-tree audit.

## Exact next work

1. Build `FINGRAPH_IMPLEMENTATION_RETURN.zip` with the packet’s required Markdown reports.
2. Verify the ZIP manifest, absence of credentials/model binaries, pushed commit, and preserved unrelated worktree change.

## Safety

- Do not edit `project/fingraph-rework` or `agents/gnn-testing`.
- Do not stop/down shared Compose services or modify shared volumes.
- Use isolated test database/containers for implementation verification.
- Do not commit generated model binaries or secrets.
