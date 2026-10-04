"""add recurring transaction reference to transactions

Revision ID: c7d4e9a1b2f3
Revises: 6b3e91f4a7c2
Create Date: 2026-10-04 15:35:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c7d4e9a1b2f3"
down_revision: Union[str, Sequence[str], None] = "6b3e91f4a7c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column(
            "recurring_transaction_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_transactions_recurring_transaction_id",
        "transactions",
        "recurring_transactions",
        ["recurring_transaction_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_transactions_recurring_transaction_id",
        "transactions",
        ["recurring_transaction_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_transactions_recurring_transaction_id",
        table_name="transactions",
    )

    op.drop_constraint(
        "fk_transactions_recurring_transaction_id",
        "transactions",
        type_="foreignkey",
    )

    op.drop_column(
        "transactions",
        "recurring_transaction_id",
    )