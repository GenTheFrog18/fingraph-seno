# FinGraph implementation checkpoint

Updated: 2026-11-10

## Current gate

- Gate 0: passed. `agents/primary` is the implementation worktree; the pre-existing `scripts/smoke-test.sh` mode-only change is preserved and the canonical runtime remains untouched.
- Gate 1: passed. Existing QRIS GraphSAGE training/inference infrastructure remains in place, with UTC-normalized timestamps and signed artifact storage retained.
- Gate 2: passed locally. Case APIs now require a centrally allowlisted analyst/admin identity; institution names never grant case access and public registration cannot create investigator accounts.
- Gate 3: passed locally. Event idempotency/conflict behavior, dismissed-case automatic reopen with audit history, and newest-history/current-observation window selection are covered by backend tests.
- Gate 4: passed locally. Case graph response is bounded and includes payment→merchant and payment→case-local-HMAC-payer-link edges with reasons; the UI renders the graph with Cytoscape rather than counts only.
- Gate 5: passed locally. Backend image builds; focused backend tests pass; frontend typecheck, lint (one pre-existing warning in `auth.ts`), and ten presentation tests pass.
- Gate 5.1: isolated stack is live on the unique demo project at port 18081; PostgreSQL readiness, Neo4j readiness, signed artifact readiness, login, case detail, graph privacy, status transitions, automatic reopen audit, and restart persistence have been observed. The demo runner now accepts a stable `--occurred-at` so repeated run IDs prove idempotency rather than payload conflict.
- Gate 6: passed. The isolated persistent PostgreSQL demo, browser acceptance, restart persistence, full 35-test backend suite, frontend checks/build, stable idempotency replay, and final stabilization ZIP all passed. ZIP SHA-256: `586c81dd741fd1cde79ed41949ef59ddb79f3f9ea5bc4e8e0f53c097615293c1`.

## Exact next work

1. Main planning agent reviews `outputs/FINGRAPH_STABILIZATION_RETURN_2026-11-10.zip` offline.
2. Preserve the unrelated pre-existing `scripts/smoke-test.sh` mode-only worktree change.

## Safety

- Do not edit `project/fingraph-rework` or `agents/gnn-testing`.
- Do not stop/down shared Compose services or modify shared volumes.
- Use isolated test database/containers for implementation verification.
- Do not commit generated model binaries or secrets.
