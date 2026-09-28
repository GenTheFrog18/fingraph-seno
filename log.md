# FinGraph Work Log and Application Guide

Date: 27 August 2026

## Work completed

### Payment security

- Blocked merchants from manually setting orders to `paid` or `held`.
- Blocked an order from becoming `completed` before it is verified as `paid`.
- Payment matching now marks an order paid only when the provider callback exists,
  its signature is valid, the payment succeeded, the amount matches, and the risk
  level is low.

Relevant file: `backend/app/api/orders.py`.

### Fraud feedback and alert authorization

- Merchant feedback is treated as review evidence, not proof of payment.
- Approving a fake receipt no longer marks its payment or order as paid.
- Merchants cannot dismiss or resolve fraud alerts through feedback.
- Merchants cannot directly PATCH an alert to `resolved` or `dismissed`.
- Only analysts and administrators can perform final alert resolution.
- Merchants can still hold or report suspicious activity.

Relevant files:

- `backend/app/api/labels.py`
- `backend/app/api/alerts.py`

### Authentication hardening

- New registration passwords require 12–72 characters.
- Login accepts at most 72 password characters, matching bcrypt limitations.
- Login performs a dummy bcrypt comparison for unknown accounts to reduce timing
  differences that could reveal whether an email exists.
- Nginx rate limiting was added to login and registration endpoints.
- A live controlled login burst was throttled with HTTP `429` responses.

Relevant files:

- `backend/app/api/auth.py`
- `backend/app/schemas/auth.py`
- `frontend/src/lib/validations/auth.ts`
- `deploy/nginx/nginx.conf`
- `deploy/nginx/conf.d/fingraph.conf`

### JWT hardening

Access tokens now contain and validate:

- issuer (`iss`);
- audience (`aud`);
- issued-at time (`iat`);
- not-before time (`nbf`);
- expiration time (`exp`);
- unique token ID (`jti`).

Relevant files:

- `backend/app/core/security.py`
- `backend/app/core/config.py`

### Machine-learning artifact security

Pickle and joblib model files are now signed with HMAC-SHA256. The application
verifies the signature before deserialization and rejects missing, modified,
symlinked, or incorrectly signed artifacts.

Relevant files:

- `backend/app/ml/artifact_security.py`
- `backend/app/ml/registry/model_registry.py`
- `backend/app/ml/baseline_model.py`

### Dependencies and error visibility

- Updated Next.js, `eslint-config-next`, PostCSS, and the frontend lockfile.
- The frontend production build and TypeScript compilation passed.
- `npm audit` reported zero known vulnerabilities after the update.
- Graph synchronization failures that were silently ignored are now logged with
  stack traces.

### Branding verification

The repository was searched case-insensitively for all requested forms of
`TrustLens` and `TrusLens`. No occurrence remained after the branding cleanup.

### Security regression testing

Regression tests now verify that a merchant cannot:

- force an order to paid;
- turn a fake receipt into a verified payment;
- dismiss an alert through payment feedback;
- dismiss an alert through the alert-status endpoint.

Test results:

- complete backend suite: 30 passed;
- focused payment and alert security regression: passed;
- Docker Compose configuration validation: passed;
- forced-paid live exploit attempt: HTTP `409`;
- login flood protection: HTTP `429`;
- frontend dependency audit: zero known vulnerabilities.

Relevant test: `backend/tests/test_qris_end_to_end.py`.

### Cloudflare Tunnel support

The `cloud.sh` launcher was added. It:

- reads `CLOUDFLARE_TUNNEL_TOKEN` from the environment or ignored `.env` file;
- provides the token to Cloudflare through a temporary read-only file;
- removes the temporary token file when the process stops;
- connects to the FinGraph Docker edge network;
- runs read-only, without Linux capabilities, and with `no-new-privileges`.

Cloudflare route configuration:

```text
Hostname: fingraph.zeroxx.my.id
Type:     HTTP
Service:  http://fingraph-qris-reverse-proxy:8080
```

The local `.env` permits the public host and browser origin:

```env
TRUSTED_HOSTS=localhost,127.0.0.1,fingraph.zeroxx.my.id
BACKEND_CORS_ORIGINS=http://localhost,https://fingraph.zeroxx.my.id
```

## Current environment status

At the end of the work session, the FinGraph containers, Docker networks, and
persistent demo-data volumes were removed as requested. Source code, `.env`, and
built Docker images remain available.

## How FinGraph works

FinGraph is a QRIS fraud-detection and transaction-monitoring application.

```text
User or browser
       |
       v
Cloudflare Tunnel (optional)
       |
       v
Nginx reverse proxy
       |-- /api/v1/* --> FastAPI backend
       `-- other URLs -> Next.js frontend
                              |
                    +---------+---------+
                    |                   |
                    v                   v
               PostgreSQL            Neo4j
             primary records    relationship graph
                    |
                    v
             Fraud scoring engine
          rules + ML + graph signals
```

### Frontend

The Next.js frontend provides separate experiences for merchants, fraud
analysts, and administrators. It sends API requests through `/api/v1`.

Location: `frontend/`.

### Backend

The FastAPI backend handles authentication, authorization, merchants, outlets,
orders, payment callbacks, fraud scoring, alerts, feedback, audit logs, reports,
graph analysis, model training, and adaptive learning.

Location: `backend/app/`.

### PostgreSQL

PostgreSQL is the source of truth. It stores users, merchants, outlets, orders,
payment events, alerts, feedback labels, audit logs, and subscription data.

### Neo4j

Neo4j represents relationships between payers, merchants, outlets, payments,
provider references, and alerts. These connections help identify suspicious
networks and repeated activity that may not be visible from a single payment.

Neo4j is optional. The application can use PostgreSQL-derived graph information
when Neo4j is unavailable.

### Payment flow

```text
Merchant creates an order
           |
           v
QRIS payment is generated
           |
           v
Provider sends a signed callback
           |
           v
Backend verifies signature and timestamp
           |
           v
Fraud engine evaluates the payment
           |
           |-- valid + matching + low risk --> order becomes paid
           |
           `-- suspicious or unverifiable --> hold + fraud alert
```

### Fraud scoring

The fraud engine can evaluate:

- callback presence and signature validity;
- payment status;
- expected and received amounts;
- duplicate provider references;
- transaction velocity;
- payer history;
- merchant and outlet risk;
- geographic differences;
- graph relationships;
- tabular ML predictions when a model is active.

It returns a fraud score, risk level, explanation codes, readable reasons, and a
recommended action. Critical rules can enforce a high minimum score even when
other signals appear normal.

### Feedback and adaptive learning

Merchants can label payments as legitimate, suspicious, or fraudulent and can
request verification, hold, or report activity. Feedback is training evidence;
it cannot prove a payment occurred. Analysts and administrators perform final
alert resolution. Collected labels can later support adaptive model training.

### Roles

#### Merchant

- Views only its own transactions, orders, outlets, and alerts.
- Creates orders and reviews payments.
- Submits feedback and reports suspicious activity.
- Cannot force payment state, dismiss fraud alerts, or access another merchant's
  private records.

#### Analyst

- Reviews broader transaction activity.
- Investigates and resolves fraud alerts.
- Uses graph, cross-border, and model-status views.

#### Administrator

- Uses administrative and activity monitoring.
- Assigns and resolves alerts.
- Runs privileged federated-learning operations.
- Reviews system-wide audit activity.

## Starting a fresh demo

```bash
cd /home/zeroxx/FinGraph/fingraph-qris-main

docker compose --env-file .env \
  -f docker-compose.yml -f docker-compose.demo.yml \
  up -d --build
```

Load fresh demo data:

```bash
docker compose --env-file .env --profile demo-seed \
  -f docker-compose.yml -f docker-compose.demo.yml \
  run --rm seed-demo
```

Start the Cloudflare connector and keep it running:

```bash
./cloud.sh
```

Application URLs:

```text
Local:  http://localhost
Public: https://fingraph.zeroxx.my.id
```

Demo credentials:

| Role | Email | Password |
|---|---|---|
| Merchant | `merchant@fingraph.id` | `password123` |
| Analyst | `analyst@fingraph.id` | `password123` |
| Administrator | `admin@fingraph.id` | `password123` |

## Stopping and deleting demo data

```bash
docker compose --env-file .env --profile demo-seed \
  -f docker-compose.yml -f docker-compose.demo.yml \
  down -v --remove-orphans
```

The `-v` option permanently removes the PostgreSQL, Neo4j, and ML artifact demo
volumes.

## Remaining recommendation

The main remaining architectural security improvement is replacing bearer tokens
stored in browser `localStorage` with secure `HttpOnly`, `Secure`, `SameSite`
cookie sessions and CSRF protection. This requires a coordinated frontend and
backend authentication redesign.
