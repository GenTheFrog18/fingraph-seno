# Presentation Cheat Sheet

## 30-second answer

“TrustLens, implemented here as FinGraph QRIS, helps MSME merchants decide whether a digital payment is safe before releasing goods. It verifies a payment-provider callback, checks hard fraud signals such as missing confirmation or amount mismatch, adds behavioral and relationship-based risk, and returns a score, reasons, and a practical action. The MVP uses simulated QRIS data, while GraphSAGE and federated learning demonstrate the path toward institution-scale collaboration.”

## 90-second pitch

“Indonesia's MSMEs increasingly depend on QRIS and other digital payments, but many still verify transactions manually. Fraud is not always visible from one transaction: several accounts can reuse one device, one payer can touch many merchants, or funds can move across regions.

TrustLens treats fraud detection as a decision-support problem. A merchant records the expected order amount. A simulated payment provider sends a signed callback. The backend verifies the callback, builds transaction and relationship features, and combines deterministic rules with optional ML and graph signals. The result is not only a score; the merchant sees why the payment is risky and whether to approve, verify, hold, or report it.

The current MVP is honest about its maturity. The full merchant workflow, role separation, audit trail, alerts, reporting, and graph exploration work today. The QRIS provider is simulated. GraphSAGE and FedAvg are prototypes showing how the system could later learn network patterns and collaborate across institutions without exchanging raw transaction rows.”

## Five-minute technical structure

1. **Problem:** screenshots and single-transaction rules miss modern fraud patterns.
2. **Input:** order amount, signed provider callback, pseudonymous payer, location, outlet, QRIS profile, and history.
3. **Trust boundary:** HMAC signature, timestamp tolerance, idempotency, ownership, and profile matching.
4. **Decision engine:** hard rules plus optional ML and graph signals; critical rules impose minimum scores.
5. **Output:** risk, confidence, human-readable reasons, alert, and order state.
6. **Learning loop:** merchant/analyst labels become data for optional adaptive retraining.
7. **Architecture:** Next.js, FastAPI, PostgreSQL, optional Neo4j, Docker, and Nginx.
8. **Maturity:** working MVP with simulators; not a deployed banking product.

## Whiteboard version

Draw five boxes:

```text
Order + PJP callback
        |
Security checks
        |
Rules / ML / graph
        |
Score + explanation
        |
Approve / verify / hold / report
```

Add PostgreSQL under all boxes as source of truth. Add Neo4j beside scoring with a dotted line and label it “optional.” Add “feedback labels” looping from the final box back to training.

## Terms worth knowing

- **Fraud score:** normalized risk indicator from `0` to `1`; not proof of guilt.
- **Confidence score:** agreement between available signals; not a calibrated probability of fraud.
- **Graph:** entities plus relationships, useful when individual events look normal but their connections do not.
- **GraphSAGE:** a GNN that aggregates neighboring node information to build node representations.
- **FedAvg:** sample-weighted averaging of model parameters from participating nodes.
- **Pseudonymization:** replacing a payer identifier with a stable keyed-HMAC token. It reduces exposure but is not the same as anonymization.
- **Idempotency:** sending the same callback twice has the same effect as sending it once.
- **False positive:** legitimate payment incorrectly flagged as suspicious.

## Safe claims

- “The MVP performs near-real-time scoring after a simulated callback.”
- “PostgreSQL is the source of truth; Neo4j is optional.”
- “Critical deterministic evidence cannot be suppressed by a low ML score.”
- “The graph explorer uses pseudonymous payer IDs.”
- “FedAvg is a transparent internal simulator.”
- “GraphSAGE training exists as an architecture prototype using Elliptic.”

## Claims to avoid

- Do not say the system is connected to Bank Indonesia, banks, or a real PJP.
- Do not say a GNN currently makes every QRIS decision.
- Do not say Flower, MLflow, Kubernetes, MinIO, Prometheus, or Grafana are implemented.
- Do not call the confidence score “model accuracy.”
- Do not claim the demo metrics prove production fraud reduction.
- Do not claim pseudonymization makes data anonymous.

## If challenged on the gap between proposal and code

“The proposal states the target architecture. For the hackathon we prioritized an end-to-end, testable merchant decision flow. We implemented the safety-critical payment path and made advanced components explicit prototypes, so the demo does not pretend to have access to bank infrastructure or real customer data.”
