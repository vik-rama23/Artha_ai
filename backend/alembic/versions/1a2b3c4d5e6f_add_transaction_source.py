"""add transaction source tracking

Revision ID: 1a2b3c4d5e6f
Revises: b8c9d0e1f2a3
Create Date: 2026-10-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column(
            "source",
            sa.String(length=20),
            nullable=False,
            server_default="MANUAL",
        ),
    )


def downgrade() -> None:
    op.drop_column("transactions", "source")
