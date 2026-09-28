# Judge Q&A

## Product and problem

### Why does an MSME need this if banking apps already show payment status?

The MVP combines the expected order, payment confirmation, risk history, and relationship signals in one decision. It is not a replacement for the bank; it is a merchant-facing risk and investigation layer. Real deployment would require official provider integration.

### Who is the customer?

The immediate user is an MSME merchant. Analysts and admins support investigation and governance. The broader proposal also targets financial institutions, but the current repository is optimized for the merchant QRIS workflow.

### What is the main value?

It converts technical signals into an operational action before goods leave the merchant: approve, verify, hold, do not release, or report and hold.

## Scoring and ML

### Is the fraud score an ML probability?

No. It is an ensemble risk score. It combines deterministic rules, optional tabular ML, a graph heuristic, and an optional adaptive model. Critical rule floors preserve safety.

### Is the confidence score model accuracy?

No. It measures agreement among available signals for this decision. Model accuracy requires evaluation against held-out labeled data.

### Is GraphSAGE live in the payment path?

No. The repository contains a PyTorch GraphSAGE training prototype for Elliptic. Live QRIS scoring currently uses a graph heuristic. This avoids falsely applying a cryptocurrency model to QRIS payments.

### Why use rules if the project is about AI?

Some evidence is deterministic. A missing official callback or mismatched amount should not be overruled by a probabilistic model. Rules provide safety; ML helps with patterns that rules cannot express.

### How do you handle class imbalance?

The QRIS logistic models use balanced class weights. PaySim XGBoost uses `scale_pos_weight`. GraphSAGE uses class-weighted cross-entropy. Production validation still needs representative labeled QRIS data and temporal holdout testing.

### How does adaptive learning work?

Merchant or analyst feedback is stored as labels. When enough fraud and legitimate examples exist, an admin can train an optional logistic-regression artifact from stored scoring features. Current prototype evaluates on training data, so its metrics must not be presented as production generalization.

## Graph and federated learning

### Why graph analysis?

Fraud often appears through relationships: one payer across many merchants, repeated alerts, shared entities, or suspicious clusters. A single transaction may look normal while its neighborhood does not.

### What if Neo4j fails?

PostgreSQL remains authoritative. Payment processing and graph exploration continue through a PostgreSQL fallback. Neo4j synchronization is best effort.

### Is federated learning real?

The FedAvg calculation is real, but the participants and parameter updates are simulated. It demonstrates weighted aggregation and the “no raw rows” boundary. It is not yet a real multi-institution training system.

### Does federated learning guarantee privacy?

No. Avoiding raw-row transfer is useful, but model updates can still leak information. Production requires secure aggregation, authentication, governance, and possibly differential privacy.

## Security and architecture

### How is a callback trusted?

The demo uses canonical JSON, HMAC-SHA256, constant-time signature comparison, a timestamp tolerance, unique provider references, and idempotent duplicate handling. Production should replace merchant JWT authentication with provider credentials or mTLS.

### How is customer identity protected?

The payer identifier becomes a stable keyed-HMAC pseudonym before storage. Settlement accounts are masked and raw callback content is represented by a hash. Pseudonymization reduces exposure but does not make the dataset anonymous.

### How do you prevent one merchant reading another merchant's data?

The backend derives the merchant profile from the authenticated user and adds merchant ownership filters to orders, payments, alerts, labels, reports, audit logs, and graph queries. Tests verify cross-merchant access returns `404`.

### Why PostgreSQL and Neo4j?

PostgreSQL handles transactional consistency and is the source of truth. Neo4j is suited to relationship exploration. Keeping Neo4j optional prevents an analytics dependency from blocking payment operations.

## Validation and roadmap

### What data trains the models?

The repository supports synthetic QRIS data, PaySim, the public Elliptic graph dataset, and labels collected inside the demo. None is equivalent to a production Indonesian QRIS fraud dataset.

### What would you build next?

First: official PJP sandbox integration and a formal data contract. Second: representative labeled data and temporal evaluation. Third: real local training nodes with secure aggregation. Fourth: rate limiting, secrets management, monitoring, backup, pentest, and regulatory review.

### What is the strongest evidence that the MVP works?

End-to-end tests cover signed callbacks, replay and invalid signatures, merchant isolation, critical scoring floors, alert/order transitions, graph fallback, cross-region semantics, FedAvg math, seed idempotency, pagination, and admin RBAC.

### What are the biggest current limitations?

No official payment integration, no real bank data, no calibrated fraud probability, no live QRIS GNN inference, simulated federated clients, and incomplete production infrastructure/compliance controls.
