"""Compatibility bridge revision for environments stamped with 2a682408ac70.

Revision ID: 2a682408ac70
Revises: 96c1f4777c60
Create Date: 2026-04-17 13:28:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "2a682408ac70"
down_revision = "96c1f4777c60"
branch_labels = None
depends_on = None


def upgrade():
    # Historical no-op migration kept for compatibility with already-stamped databases.
    pass


def downgrade():
    pass
