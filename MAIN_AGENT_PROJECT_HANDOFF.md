# FinGraph — Updated Project Handoff

Updated: 2026-11-11  
Branch: `agent/primary`  
Latest pushed commit: `b0c22f2`

## Product

FinGraph is now a **cross-PSP QRIS fraud-intelligence platform** for institutional fraud and risk investigators.

It is not primarily a consumer payment app or merchant dashboard. The main product workflow is:

```text
PSP signed QRIS events
  → normalize and persist observations
  → score with GNN + graph heuristic
  → detect coordinated merchant/payer topology
  → create an investigation case
  → review evidence and graph
  → record status decisions and audit history
```

The legacy merchant, federated-learning, cross-border, and model-lab routes remain for compatibility, but they are no longer the primary investigator navigation path.

## Current architecture

```text
PSP systems
  → POST /api/v1/psp/events with provider HMAC
  → FastAPI backend
      → PostgreSQL: observations, cases, case links, users, audit logs
      → signed QRIS GraphSAGE artifact
      → bounded temporal graph heuristic
      → case APIs
  → Next.js investigator dashboard
      → Cytoscape case evidence graph

Neo4j remains optional infrastructure; PostgreSQL is the QRIS system of record.
```

### Backend

- FastAPI application: `backend/app/`
- QRIS ingestion and case APIs: `backend/app/api/psp_intelligence.py`
- Central investigator authorization: `backend/app/api/deps.py`
- Case scoring/lifecycle: `backend/app/services/qris_intelligence.py`
- Models: `backend/app/models/qris_intelligence.py`
- Existing migration head: `20261110_0007`

### Frontend

- Next.js application: `frontend/src/`
- Primary investigator page: `frontend/src/app/dashboard/cases/page.tsx`
- Investigator navigation: `frontend/src/components/layout/product-shells.tsx`
- Case graph uses installed `cytoscape` and `cytoscape-cose-bilkent`.

### GNN

- Dataset/normalization: `backend/app/ml/graph/dataset.py`
- Model: `backend/app/ml/graph/model.py`
- Training: `backend/app/ml/graph/training.py`
- Inference: `backend/app/ml/graph/inference.py`
- Training command: `backend/scripts/train_qris_gnn.py`
- Demo event sender: `backend/scripts/run_psp_demo.py`

The GNN infrastructure was preserved. Verified inference uses a signed `qris_graph` artifact. If the artifact is unavailable or inference fails, the system records an explicit graph-heuristic fallback; it does not pretend the model completed.

## Security and data contracts

### PSP ingestion

`POST /api/v1/psp/events` requires:

- `X-FG-Provider`
- `X-FG-Timestamp`
- `X-FG-Signature`

The signature is HMAC-SHA256 over `timestamp + "." + raw_body`, using `PSP_EVENT_KEYS`. The payload requires the QRIS v1 schema, `payment.succeeded`, `QRIS`, and `IDR`; extra fields are rejected.

Provider/event and provider/payment uniqueness provide idempotency:

- unchanged duplicate → `202` / `already_seen`
- changed body with same provider/event → `409`
- invalid signature or stale timestamp → `401`

### Investigator access

Case list, detail, evidence, graph, and status routes require:

1. role `analyst` or `admin`; and
2. email in `CENTRAL_INVESTIGATOR_EMAILS`.

`institution_name` is not a case-visibility boundary. A fabricated PSP-affiliated analyst account is denied. Public registration can create merchant accounts only.

### Privacy

- Raw payer tokens are never returned by case detail or graph APIs.
- Graph payer nodes use case-local HMAC aliases such as `Payer A`.
- Merchant graph identity is provider-namespaced: `provider:merchant_ref`.
- Graph output is bounded by `QRIS_CASE_GRAPH_MAX_OBSERVATIONS` and reports truncation metadata.

## Case and graph behavior

The topology detector currently opens a coordinated merchant network case when the component reaches at least:

- 3 merchants
- 3 acquirers
- 2 issuer/scheme-scoped payer links

Case scores are explicitly **investigative priority**, not crime probability.

`GET /api/v1/cases/{case_id}/graph` returns payment nodes, provider-namespaced merchant nodes, case-local payer-link nodes, and edges with relationship reasons. The frontend renders that response as a real Cytoscape graph.

Dismissed exact-fingerprint cases safely reopen as `suspected` when matching new evidence arrives. The previous review decision is preserved in `AuditLog` through `reopen_network_case`.

Temporal windows are UTC-normalized, capped, newest-history-first, and always include the current observation.

## Verified implementation state

The implementation was verified in an isolated Compose project named `fingraph-stabilization`:

- six signed PSP events accepted
- one cross-PSP case created
- six complete GNN scores with zero fallback/errors
- PostgreSQL readiness passed
- signed artifact readiness passed
- status lifecycle and dismissed-case reopen passed
- backend restart preserved the case and artifact hash
- stable replay returned six `already_seen` responses
- headless browser rendered the investigator graph page

Automated checks:

- backend: 35 tests passed
- frontend: typecheck passed
- frontend: 10 tests passed
- frontend: lint passed with one pre-existing warning in `frontend/src/lib/auth.ts:58`
- frontend production build passed

The complete offline return package is:

[FINGRAPH_STABILIZATION_RETURN_2026-11-10.zip](outputs/FINGRAPH_STABILIZATION_RETURN_2026-11-10.zip)

## Local demo

Use a free port; the previous shared environment used `18080`, so `18081` is safer:

```bash
FINGRAPH_DEMO_PORT=18081 ./scripts/stabilization-demo.sh start
FINGRAPH_DEMO_PORT=18081 ./scripts/stabilization-demo.sh events
```

Open `http://127.0.0.1:18081`, log in as `analyst@fingraph.id` with the local demo password `password123`, then open **Kasus lintas-PSP**.

Restart verification:

```bash
FINGRAPH_DEMO_PORT=18081 ./scripts/stabilization-demo.sh restart
curl -fsS http://127.0.0.1:18081/api/v1/health/ready
```

Stop only the isolated project with:

```bash
FINGRAPH_DEMO_PORT=18081 ./scripts/stabilization-demo.sh stop
```

## Remaining production work

- Real PSP onboarding, key rotation, KMS/secret-manager integration.
- Approved real labeled data and model calibration/drift monitoring.
- Distributed rate limiting, queue/backpressure, and replay observability.
- Investigator assignment, notes, escalation, evidence export, and collaboration.
- Backup/restore drills, monitoring, legal/privacy review, HTTPS, and security assessment.
- Deliberate retirement or isolation of legacy routes after the new workflow is approved.

Do not describe the synthetic demo model as production fraud accuracy, and do not expose raw payer tokens or treat the investigative score as an automated enforcement decision.
