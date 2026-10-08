"""add account opening balance date

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-10-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column(
            "opening_balance_date",
            sa.Date(),
            nullable=True,
        ),
    )

    # Existing accounts were already usable from the date they were
    # created in Artha, so preserve that behavior for historical
    # reporting by using created_at as their opening balance date.
    op.execute(
        """
        UPDATE accounts
        SET opening_balance_date = created_at::date
        WHERE opening_balance_date IS NULL
        """
    )

    op.alter_column(
        "accounts",
        "opening_balance_date",
        nullable=False,
    )

    op.create_index(
        "idx_accounts_opening_balance_date",
        "accounts",
        ["opening_balance_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_accounts_opening_balance_date",
        table_name="accounts",
    )

    op.drop_column(
        "accounts",
        "opening_balance_date",
    )
