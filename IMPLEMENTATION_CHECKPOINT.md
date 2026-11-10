# FinGraph implementation checkpoint

Updated: 2026-11-10

## Current gate

- Gate 0: passed. `agents/primary` is the implementation worktree; existing `scripts/smoke-test.sh` mode change preserved. Canonical runtime remains untouched.
- Gate 1: passed in a disposable backend-image container. The archived QRIS GraphSAGE adapter trained, saved, reloaded, and inferred on a heterogeneous graph. The repeatable local trainer now creates a signed `qris_graph` artifact and records temporal-split metrics and an artifact hash.
- Gate 2: passed. Additive `qris_observations`/`network_cases`/`case_observations` storage, per-PSP HMAC authentication, freshness, idempotency, conflict handling, strict schema validation, and redacted case APIs are implemented.
- Gate 3: passed. Learned QRIS GraphSAGE inference is used when a verified artifact is present; the bounded graph heuristic remains a separate fallback and is recorded in provenance.
- Gate 4: passed. The analyst shell includes a network-case list/detail view, status transitions, evidence observations, and a privacy-preserving case graph summary.
- Gate 5: in final audit. Re-run backend/frontend checks, Docker build, live three-PSP demo, and package the required return ZIP.

## Exact next work

1. Re-run the final isolated backend and frontend suites.
2. Validate the production Docker image includes the pinned PyG dependency.
3. Capture sanitized live-demo and GNN evidence.
4. Build `FINGRAPH_IMPLEMENTATION_RETURN.zip` with the packet’s required Markdown reports.

## Safety

- Do not edit `project/fingraph-rework` or `agents/gnn-testing`.
- Do not stop/down shared Compose services or modify shared volumes.
- Use isolated test database/containers for implementation verification.
- Do not commit generated model binaries or secrets.
