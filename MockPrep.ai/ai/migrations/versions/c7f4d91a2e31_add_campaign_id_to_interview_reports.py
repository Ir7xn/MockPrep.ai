"""Add campaign_id to interview_reports

Revision ID: c7f4d91a2e31
Revises: 96c1f4777c60
Create Date: 2026-04-17 13:05:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "c7f4d91a2e31"
down_revision = "2a682408ac70"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "interview_reports",
        sa.Column("campaign_id", sa.String(length=255), nullable=True),
    )
    op.execute("UPDATE interview_reports SET campaign_id = 'legacy' WHERE campaign_id IS NULL")
    op.alter_column("interview_reports", "campaign_id", nullable=False)
    op.create_index(
        "ix_interview_reports_campaign_id",
        "interview_reports",
        ["campaign_id"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_interview_reports_campaign_id", table_name="interview_reports")
    op.drop_column("interview_reports", "campaign_id")
