"""Add isolated PSP observation and network case storage.

Revision ID: 20261110_0007
Revises: 20260723_0006
"""

from alembic import op
import sqlalchemy as sa


revision = "20261110_0007"
down_revision = "20260723_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "qris_observations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("schema_version", sa.String(length=50), nullable=False),
        sa.Column("source_provider_id", sa.String(length=80), nullable=False),
        sa.Column("source_event_id", sa.String(length=120), nullable=False),
        sa.Column("source_payment_id", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("payment_method", sa.String(length=20), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=False),
        sa.Column("amount_idr", sa.BigInteger(), nullable=False),
        sa.Column("merchant_ref", sa.String(length=120), nullable=False),
        sa.Column("acquirer_id", sa.String(length=80), nullable=False),
        sa.Column("issuer_id", sa.String(length=80), nullable=False),
        sa.Column("payer_token", sa.String(length=180), nullable=True),
        sa.Column("payer_token_scheme", sa.String(length=80), nullable=True),
        sa.Column("qris_ref", sa.String(length=120), nullable=True),
        sa.Column("raw_payload_hash", sa.String(length=64), nullable=False),
        sa.Column("send_timestamp", sa.BigInteger(), nullable=False),
        sa.Column("signature_key_id", sa.String(length=120), nullable=False),
        sa.Column("scoring_status", sa.String(length=30), nullable=False),
        sa.Column("gnn_score", sa.Float(), nullable=True),
        sa.Column("graph_heuristic_score", sa.Float(), nullable=True),
        sa.Column("score_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_provider_id", "source_event_id", name="uq_qris_observation_provider_event"),
        sa.UniqueConstraint("source_provider_id", "source_payment_id", name="uq_qris_observation_provider_payment"),
    )
    op.create_index("ix_qris_observations_received_at", "qris_observations", ["received_at"])
    op.create_index(
        "ix_qris_observations_provider_merchant_time",
        "qris_observations",
        ["source_provider_id", "merchant_ref", "received_at"],
    )
    op.create_index(
        "ix_qris_observations_issuer_payer_time",
        "qris_observations",
        ["issuer_id", "payer_token", "received_at"],
    )

    op.create_table(
        "network_cases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("candidate_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("model_provenance", sa.JSON(), nullable=True),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("reviewer", sa.String(length=120), nullable=True),
        sa.Column("reviewer_decision", sa.String(length=40), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_fingerprint"),
    )
    op.create_index("ix_network_cases_status", "network_cases", ["status"])
    op.create_index("ix_network_cases_candidate_fingerprint", "network_cases", ["candidate_fingerprint"], unique=True)

    op.create_table(
        "case_observations",
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("observation_id", sa.Uuid(), nullable=False),
        sa.Column("evidence_reason", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["network_cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["observation_id"], ["qris_observations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("case_id", "observation_id"),
    )


def downgrade() -> None:
    op.drop_table("case_observations")
    op.drop_index("ix_network_cases_candidate_fingerprint", table_name="network_cases")
    op.drop_index("ix_network_cases_status", table_name="network_cases")
    op.drop_table("network_cases")
    op.drop_index("ix_qris_observations_issuer_payer_time", table_name="qris_observations")
    op.drop_index("ix_qris_observations_provider_merchant_time", table_name="qris_observations")
    op.drop_index("ix_qris_observations_received_at", table_name="qris_observations")
    op.drop_table("qris_observations")
