# FinGraph implementation checkpoint

Updated: 2026-11-10

## Current gate

- Gate 0: passed. `agents/primary` is the implementation worktree; the pre-existing `scripts/smoke-test.sh` mode-only change is preserved and the canonical runtime remains untouched.
- Gate 1: passed. Existing QRIS GraphSAGE training/inference infrastructure remains in place, with UTC-normalized timestamps and signed artifact storage retained.
- Gate 2: passed locally. Case APIs now require a centrally allowlisted analyst/admin identity; institution names never grant case access and public registration cannot create investigator accounts.
- Gate 3: passed locally. Event idempotency/conflict behavior, dismissed-case automatic reopen with audit history, and newest-history/current-observation window selection are covered by backend tests.
- Gate 4: passed locally. Case graph response is bounded and includes payment→merchant and payment→case-local-HMAC-payer-link edges with reasons; the UI renders the graph with Cytoscape rather than counts only.
- Gate 5: passed locally. Backend image builds; focused backend tests pass; frontend typecheck, lint (one pre-existing warning in `auth.ts`), and ten presentation tests pass.
- Gate 6: pending. The isolated persistent PostgreSQL demo, browser acceptance, restart persistence, full test suite, and final stabilization ZIP remain.

## Exact next work

1. Run `scripts/stabilization-demo.sh start`, train the artifact on its persistent volume, and send six signed events.
2. Verify PostgreSQL persistence, GNN provenance, central investigator login, graph evidence, case status/reopen, and artifact persistence after restart.
3. Package the required sanitized stabilization return ZIP and push the final checkpoint.

## Safety

- Do not edit `project/fingraph-rework` or `agents/gnn-testing`.
- Do not stop/down shared Compose services or modify shared volumes.
- Use isolated test database/containers for implementation verification.
- Do not commit generated model binaries or secrets.
